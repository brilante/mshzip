'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// DB 모델 (지연 로드 - DB 미연결 시 안전)
let User;
try {
  User = require('../db/models/User');
} catch (e) {
  console.warn('[Passport] User 모델 로드 실패:', e.message);
}

let BackupSchedule;
try {
  BackupSchedule = require('../db/models/BackupSchedule').BackupSchedule;
} catch (e) {
  console.warn('[Passport] BackupSchedule 모델 로드 실패:', e.message);
}

// 세션 직렬화 (username만 저장 → 보안 + 일관성)
passport.serializeUser((user, done) => {
  done(null, user.username || user);
});

passport.deserializeUser(async (username, done) => {
  // username 문자열이 아닌 경우 (이전 세션 호환)
  if (typeof username === 'object') {
    return done(null, username);
  }

  // DB에서 사용자 조회
  if (User) {
    try {
      const user = await User.findByUsername(username);
      if (user) {
        return done(null, {
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          authProvider: user.auth_provider,
          googleId: user.google_id
        });
      }
    } catch (err) {
      console.warn('[Passport] deserializeUser DB 조회 실패:', err.message);
    }
  }

  // DB 미연결 또는 조회 실패 시 최소 정보 반환
  done(null, { username });
});

// Google OAuth 전략
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5858/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || '';
    const googleId = profile.id;
    const displayName = profile.displayName || '';

    console.log(`[Passport] Google 로그인 시도: ${email} (${googleId})`);

    // DB에 사용자 upsert (참고소스 동등 구현 - 암호화 내장)
    if (User) {
      try {
        const result = await User.upsertGoogleUser(profile);

        if (result.success && result.user) {
          // BackupSchedule 자동 생성 (중복 방지)
          if (BackupSchedule) {
            try {
              const existing = await BackupSchedule.getByUserId(result.user.username);
              if (!existing) {
                await BackupSchedule.create(result.user.username, new Date().toISOString());
                console.log(`[Passport] BackupSchedule 생성: ${result.user.username}`);
              }
            } catch (bsErr) {
              console.warn('[Passport] BackupSchedule 생성 실패:', bsErr.message);
            }
          }

          const isNewLog = result.isNew ? '신규' : '기존';
          console.log(`[Passport] Google 로그인 (${isNewLog} 사용자): ${result.user.username}`);
          return done(null, {
            username: result.user.username,
            email: result.user.email || email,
            displayName: result.user.display_name || displayName,
            googleId: result.user.google_id || googleId,
            authProvider: result.user.auth_provider || 'google'
          });
        } else {
          console.warn('[Passport] upsertGoogleUser 실패:', result.error);
        }
      } catch (dbErr) {
        console.warn('[Passport] Google OAuth DB 처리 실패, 세션만 사용:', dbErr.message);
      }
    }

    // DB 미연결 시 세션만 사용 (스텁 폴백)
    const username = (email ? email.split('@')[0] : googleId).toLowerCase();
    const user = { username, email, displayName, googleId, authProvider: 'google' };
    console.log(`[Passport] Google 로그인 (스텁): ${username} (${email})`);
    return done(null, user);
  }));
} else {
  console.warn('[Passport] Google OAuth 설정 누락 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)');
}

module.exports = passport;
