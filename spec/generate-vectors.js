#!/usr/bin/env node
'use strict';

/**
 * 교차 호환성 테스트 벡터 생성기
 * Node.js mshzip으로 .bin/.msh 쌍을 생성한다.
 * Python에서 이 .msh 파일을 해제하여 교차 호환을 검증한다.
 */

const fs = require('fs');
const path = require('path');
const { pack } = require('../nodejs/lib/index');

const OUT_DIR = path.join(__dirname, 'test-vectors');
fs.mkdirSync(OUT_DIR, { recursive: true });

function write(name, data, opts = {}) {
  const binPath = path.join(OUT_DIR, `${name}.bin`);
  const mshPath = path.join(OUT_DIR, `${name}.msh`);
  fs.writeFileSync(binPath, data);
  fs.writeFileSync(mshPath, pack(data, opts));
  console.log(`  ${name}: ${data.length}B -> ${fs.statSync(mshPath).size}B`);
}

console.log('테스트 벡터 생성 중...\n');

// 1. 빈 입력
write('empty', Buffer.alloc(0));

// 2. 반복 패턴
const repeat = Buffer.alloc(1024);
for (let i = 0; i < 1024; i++) repeat[i] = i % 256;
write('small-repeat', repeat);

// 3. 경계값
write('boundary-127', Buffer.alloc(127, 0x41));
write('boundary-128', Buffer.alloc(128, 0x42));
write('boundary-129', Buffer.alloc(129, 0x43));

// 4. 멀티프레임 (작은 frameLimit)
const multiData = Buffer.alloc(512);
for (let i = 0; i < 512; i++) multiData[i] = i % 256;
write('multi-frame', multiData, { chunkSize: 32, frameLimit: 128 });

// 5. CRC32 활성화
write('crc32', Buffer.from('CRC32 test data'.repeat(20)), { crc: true });

// 6. codec=none
write('codec-none', Buffer.from('no compression'.repeat(30)), { codec: 'none' });

// 7. 큰 청크 크기
write('large-chunk', Buffer.alloc(8192, 0xAB), { chunkSize: 4096 });

// 8. 텍스트 데이터
write('text-data', Buffer.from('Hello World! '.repeat(100)));

// 9. 바이너리 데이터
const binary = Buffer.alloc(2048);
for (let i = 0; i < 2048; i++) binary[i] = Math.floor(Math.random() * 256);
write('binary-random', binary);

// 10. 1바이트
write('single-byte', Buffer.from([0x42]));

console.log('\n테스트 벡터 생성 완료!');
