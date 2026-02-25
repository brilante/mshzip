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
app.use(express.json());

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
const ToolCategory = require('./src/db/models/ToolCategory');
const Tool = require('./src/db/models/Tool');

(async () => {
  try {
    await db.connect();
    await UserSettings.initTable();
    const BackupCode = require('./src/db/models/BackupCode');
    await BackupCode.initTable();
    await ToolCategory.initTable();
    await ToolCategory.seedDefaultCategories();
    await Tool.initTable();
    await Tool.seedDefaultTools();
  } catch (err) {
    console.warn('[DB] 연결 실패 (스텁 모드로 동작):', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[서버] http://localhost:${PORT} 에서 실행 중`);
  });
})();
