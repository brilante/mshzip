'use strict';

const express = require('express');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4949;

// 보안 헤더
app.use(helmet({
  contentSecurityPolicy: false // 인라인 스크립트 허용 (개발용)
}));
app.disable('x-powered-by');

// 미들웨어
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API 라우트
app.use('/api', require('./src/api/example'));
app.use('/api', require('./src/api/stubs'));

// 클린 URL → HTML 파일 매핑
const publicDir = path.join(__dirname, 'public');
app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(publicDir, 'settings.html')));
app.get('/payment-success', (req, res) => res.sendFile(path.join(publicDir, 'payment-success.html')));

// 서버 시작
app.listen(PORT, () => {
  console.log(`[서버] http://localhost:${PORT} 에서 실행 중`);
});
