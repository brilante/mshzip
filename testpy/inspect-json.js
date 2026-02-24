const fs = require('fs');
const jsonPath = 'G:\\MyWrok\\mymind3\\save\\JDJiJDEwJFFHcE9Tc3pkWkl2bDZncjVKWm5pdmVjVnR2bXEvbXguNDVURnVVQ2JzTFVxcklnOVVlL1NXUeWah5faIQcX66ccmeX4\\개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1\\개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1.json';

const raw = fs.readFileSync(jsonPath, 'utf-8');
const data = JSON.parse(raw);

// 최상위 키 확인
console.log('Type:', typeof data);
console.log('Is Array:', Array.isArray(data));
if (typeof data === 'object' && !Array.isArray(data)) {
  console.log('Top-level keys:', Object.keys(data));
  // 각 키의 타입과 길이
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (Array.isArray(val)) {
      console.log(`  ${key}: Array[${val.length}]`);
      if (val.length > 0) console.log(`    first item keys:`, Object.keys(val[0]));
    } else if (typeof val === 'object' && val !== null) {
      console.log(`  ${key}: Object keys:`, Object.keys(val));
    } else {
      console.log(`  ${key}:`, String(val).substring(0, 100));
    }
  }
}

// 전체 내용에서 3ZOZ 검색
if (raw.includes('3ZOZ')) {
  console.log('\n3ZOZ found in raw JSON');
  const idx = raw.indexOf('3ZOZ');
  console.log('Context:', raw.substring(Math.max(0, idx-50), idx+60));
} else {
  console.log('\n3ZOZ NOT found in raw JSON');
}

// G6QN 검색
if (raw.includes('G6QN')) {
  console.log('G6QN found in raw JSON');
  const idx = raw.indexOf('G6QN');
  console.log('Context:', raw.substring(Math.max(0, idx-50), idx+60));
}
