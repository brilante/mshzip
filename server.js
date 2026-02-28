'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5858;

// 보안 헤더
app.use(helmet({
  contentSecurityPolicy: false // 인라인 스크립트 허용 (개발용)
}));
app.disable('x-powered-by');

// 미들웨어
// ★ /api/skill은 자체 skillJsonParser 사용 (gzip 압축 지원)
//   express.json()이 먼저 스트림을 소비하면 skillJsonParser가 hang에 걸림
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/skill')) return next();
  express.json()(req, res, next);
});

// 세션 (OAuth state 저장용)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Passport 초기화
require('./src/config/passport');
app.use(passport.initialize());
app.use(passport.session());

// ★ 세션 기반 경로 캐시 워밍 미들웨어
//
// 흐름:
//   1. 로그인 시 auth.js의 ensureUserStorage()가 세션에 userStorageInfo 저장
//   2. 이 미들웨어가 매 요청마다 UserIdEncoder._folderCache에 주입
//   3. 이후 resolveUserPath() 호출 시 DB 조회 없이 캐시 히트 즉시 반환
//
// 해제:
//   - 로그아웃 시 req.session.destroy()로 세션 전체 파기 → userStorageInfo 자동 삭제
//   - 세션 만료(maxAge 24h) 시 자동 파기 (서버사이드 메모리만 사용)
app.use((req, _res, next) => {
  const storageInfo = req.session?.userStorageInfo;
  if (storageInfo?.userId && storageInfo?.relativePath) {
    // UserIdEncoder._folderCache는 userIdEncoder.js에서
    // 정적 프로퍼티로 노출된 모듈 레벨 Map
    const UserIdEncoder = require('./src/utils/userIdEncoder');
    const cache = UserIdEncoder._folderCache;
    if (cache) {
      const resolveKey = `resolve_${storageInfo.userId}`;
      if (!cache.has(resolveKey)) {
        // 포워드 슬래시 정규화된 relativePath 주입
        const rel = storageInfo.relativePath.replace(/\\/g, '/');
        cache.set(resolveKey, rel);          // resolveUserPath() 캐시 키
        cache.set(String(storageInfo.userId), rel); // findUserFolderSync() 캐시 키
      }
    }
  }
  next();
});

// settings/ 디렉토리 partial 파일 직접 접근 차단 (SSI용 내부 파일)
app.use('/settings/', (req, res) => {
  res.status(404).end();
});

// settings.html 직접 접근 차단 + SSI(서버사이드 include) 조립
// @include 마커를 public/settings/ 디렉토리의 partial 파일로 치환하여 응답
app.use('/settings.html', (req, res, next) => {
  const secFetchDest = req.headers['sec-fetch-dest'];
  if (secFetchDest === 'document' || !secFetchDest) {
    return res.redirect('/');
  }

  // SSI 조립: settings.html의 @include 마커를 partial 파일 내용으로 치환
  const pubDir = path.join(__dirname, 'public');
  const templatePath = path.join(pubDir, 'settings.html');
  const partialsDir = path.join(pubDir, 'settings');

  try {
    let html = fs.readFileSync(templatePath, 'utf8');

    // <!-- @include filename.html --> 패턴을 찾아 파일 내용으로 치환
    html = html.replace(/<!--\s*@include\s+([\w-]+\.html)\s*-->/g, (match, filename) => {
      const partialPath = path.join(partialsDir, filename);
      try {
        return fs.readFileSync(partialPath, 'utf8');
      } catch (err) {
        console.warn(`[SSI] partial 파일 로드 실패: ${filename}`);
        return `<!-- SSI ERROR -->`;
      }
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.send(html);
  } catch (err) {
    console.error('[SSI] settings.html 조립 실패:', err.message);
    next(err);
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// API 라우트 (순서 중요: 구현된 라우트 → 스텁 catch-all)
app.use('/api', require('./src/api/example'));
app.use('/api', require('./src/api/mindmap'));
app.use('/api/access-keys', require('./src/api/access-keys'));
app.use('/api/2fa', require('./src/api/2fa'));
app.use('/api/skill', require('./src/api/skill'));
app.use('/api/node-id', require('./src/api/node-id'));
app.use('/api/tools', require('./src/api/tools'));
app.use('/api/admin', require('./src/api/stubs/admin-batch'));
app.use('/api/boards', require('./src/api/boards'));
app.use('/api/backup', require('./src/api/backup'));
app.use('/api', require('./src/api/stubs'));

// 클린 URL → HTML 파일 매핑
const publicDir = path.join(__dirname, 'public');
app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get('/app', (req, res) => res.redirect('/' + (req._parsedUrl.search || '')));
app.get('/settings', (req, res) => res.sendFile(path.join(publicDir, 'settings.html')));
app.get('/payment-success', (req, res) => res.sendFile(path.join(publicDir, 'payment-success.html')));

// DB 연결 + 서버 시작
const db = require('./src/db');
const UserSettings = require('./src/db/models/UserSettings');
const User = require('./src/db/models/User');
const AdminUser = require('./src/db/models/AdminUser');
const ToolCategory = require('./src/db/models/ToolCategory');
const Tool = require('./src/db/models/Tool');
const DriveSettings = require('./src/db/models/DriveSettings');

/**
 * 기존 사용자 UserIdMapping 등록 보장
 * user_id_mapping에 없거나 date_path가 null이면 등록/갱신
 * - created_at이 있으면 그 날짜 기준, 없으면 현재 KST
 */
async function ensureUserIdMapping(user) {
  if (!user || !user.username) return;
  try {
    const UserIdEncoder = require('./src/utils/userIdEncoder');
    const UserIdMapping = require('./src/db/models/UserIdMapping');
    const uid = user.username;
    const existing = await UserIdMapping.findByUserId(uid);

    // date_path 이미 있으면 스킵
    if (existing?.date_path) return;

    const hash = UserIdEncoder.encode(uid);
    const legacyFolder = Buffer.from(uid).toString('base64');
    // created_at 기준 KST 날짜 계산
    const datePath = UserIdEncoder.calculateDatePath(user.created_at || null);
    await UserIdMapping.create(uid, hash, legacyFolder, datePath);
    console.log(`[Init] UserIdMapping 마이그레이션: userId=${uid}, datePath=${datePath}`);
  } catch (e) {
    console.warn('[Init] UserIdMapping 마이그레이션 실패:', e.message);
  }
}

/**
 * 기본 테스트 사용자 생성 (.env TEST_ADMIN_* 기반)
 * DB에 없으면 자동 생성
 */
async function ensureDefaultUser() {
  const rawUsername = process.env.TEST_ADMIN_USERNAME;
  const password = process.env.TEST_ADMIN_PASSWORD;
  const email = process.env.TEST_ADMIN_EMAIL;

  if (!rawUsername || !password) {
    console.warn('[Init] TEST_ADMIN_USERNAME/PASSWORD 환경변수 미설정 - 기본 사용자 생성 건너뜀');
    return;
  }

  const username = rawUsername.toLowerCase();
  const existing = await User.findByUsername(username);
  if (!existing) {
    await User.create({ username, email: email || `${username}@local`, password, authProvider: 'local' });
    console.log(`[Init] 기본 사용자 생성: ${username}`);
  } else {
    console.log(`[Init] 기본 사용자 확인: ${username} (이미 존재)`);
    await ensureUserIdMapping(existing);
  }
}

/**
 * 기본 관리자 등록 (.env TEST_ADMIN_USERNAME 기반)
 * admin_users 테이블에 없으면 자동 생성
 */
async function ensureDefaultAdmin() {
  const rawUsername = process.env.TEST_ADMIN_USERNAME;
  const password = process.env.TEST_ADMIN_PASSWORD;

  if (!rawUsername || !password) return;

  const username = rawUsername.toLowerCase();
  const existing = await AdminUser.findByUserId(username);
  if (!existing) {
    await AdminUser.create(username, password);
    console.log(`[Init] 기본 관리자 생성: ${username}`);
  } else {
    console.log(`[Init] 기본 관리자 확인: ${username} (이미 존재)`);
  }
}

/**
 * TEST_ADMIN 계정 생성 (.env TEST_ADMIN_* 기반)
 * username을 lowercase로 정규화하여 단일 계정으로 통합
 */
async function ensureAdminTestUser() {
  const rawUsername = process.env.TEST_ADMIN_USERNAME;
  const password = process.env.TEST_ADMIN_PASSWORD;
  const email = process.env.TEST_ADMIN_EMAIL;

  if (!rawUsername || !password) {
    console.warn('[Init] TEST_ADMIN_USERNAME/PASSWORD 환경변수 미설정 - 관리자 테스트 계정 생성 건너뜀');
    return;
  }

  // lowercase 정규화 (예: TestUser → testuser)
  const username = rawUsername.toLowerCase();

  // users 테이블에 계정 생성
  const existing = await User.findByUsername(username);
  if (!existing) {
    await User.create({ username, email: email || `${username}@local`, password, authProvider: 'local' });
    console.log(`[Init] 관리자 테스트 사용자 생성: ${username}`);
  } else {
    console.log(`[Init] 관리자 테스트 사용자 확인: ${username} (이미 존재)`);
    await ensureUserIdMapping(existing);
  }

  // admin_users 테이블에도 등록
  const adminExisting = await AdminUser.findByUserId(username);
  if (!adminExisting) {
    await AdminUser.create(username, password);
    console.log(`[Init] 관리자 권한 부여: ${username}`);
  }
}

(async () => {
  try {
    await db.connect();
    await User.initTable();
    await AdminUser.initTable();
    await UserSettings.initTable();
    const BackupCode = require('./src/db/models/BackupCode');
    await BackupCode.initTable();
    await ToolCategory.initTable();
    await ToolCategory.seedDefaultCategories();
    await Tool.initTable();
    await Tool.seedDefaultTools();
    await DriveSettings.initTable();
    const UserIdMapping = require('./src/db/models/UserIdMapping');
    await UserIdMapping.initTable();
    // 백업 관련 테이블 초기화
    const { BackupSchedule, BackupHistory } = require('./src/db/models/BackupSchedule');
    await BackupSchedule.initTable();
    await BackupHistory.initTable();

    // 기본 사용자 및 관리자 생성
    await ensureDefaultUser();
    await ensureDefaultAdmin();
    await ensureAdminTestUser();
  } catch (err) {
    console.warn('[DB] 연결 실패 (스텁 모드로 동작):', err.message);
  }

  // 백업 서비스 시작
  try {
    const backupService = require('./src/services/backupService');
    backupService.start();
  } catch (err) {
    console.warn('[BackupService] 시작 실패:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[서버] http://localhost:${PORT} 에서 실행 중`);
  });
})();
