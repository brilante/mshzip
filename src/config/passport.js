'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// 세션 직렬화 (세션에 사용자 정보 저장)
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth 전략
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5858/api/auth/google/callback'
  }, (accessToken, refreshToken, profile, done) => {
    const user = {
      username: profile.emails?.[0]?.value?.split('@')[0] || profile.id,
      email: profile.emails?.[0]?.value || '',
      displayName: profile.displayName || '',
      googleId: profile.id,
      authProvider: 'google'
    };
    console.log(`[Passport] Google 로그인: ${user.username} (${user.email})`);
    return done(null, user);
  }));
} else {
  console.warn('[Passport] Google OAuth 설정 누락 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)');
}

module.exports = passport;
