'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'results.db'));

function sizeLabel(s) {
  if (s >= 1048576) return (s / 1048576) + 'MB';
  if (s >= 1024) return (s / 1024) + 'KB';
  return s + 'B';
}

// Q3: 최적 차원 (크기별)
console.log('=== Q3: CoordDict 최적 차원 (크기별, Node.js) ===');
const q3 = db.prepare(`
  SELECT data_size, dimensions,
         ROUND(AVG(ratio), 2) as avg_ratio,
         ROUND(AVG(pack_ms), 2) as avg_pack_ms
  FROM benchmarks
  WHERE mode = 'coorddict' AND platform = 'nodejs' AND crc = 0
  GROUP BY data_size, dimensions
  ORDER BY data_size, avg_ratio DESC
`).all();
let prev = 0;
for (const r of q3) {
  if (r.data_size !== prev) { console.log(''); prev = r.data_size; }
  const best = (r === q3.filter(x => x.data_size === r.data_size)[0]) ? ' <-- BEST' : '';
  console.log(`  ${sizeLabel(r.data_size).padEnd(8)} D=${String(r.dimensions).padEnd(3)} ratio=${String(r.avg_ratio).padStart(8)}%  pack=${String(r.avg_pack_ms).padStart(8)}ms${best}`);
}

// Q4: CRC32 오버헤드
console.log('\n=== Q4: CRC32 오버헤드 분석 ===');
const q4 = db.prepare(`
  SELECT c0.mode,
         ROUND(AVG(c0.ratio), 2) as no_crc,
         ROUND(AVG(c1.ratio), 2) as with_crc,
         ROUND(AVG(c0.ratio) - AVG(c1.ratio), 3) as overhead
  FROM benchmarks c0
  JOIN benchmarks c1 ON c0.data_type = c1.data_type
                     AND c0.data_size = c1.data_size
                     AND c0.mode = c1.mode
                     AND c0.platform = c1.platform
                     AND COALESCE(c0.dimensions, 0) = COALESCE(c1.dimensions, 0)
  WHERE c0.crc = 0 AND c1.crc = 1 AND c0.platform = 'nodejs'
  GROUP BY c0.mode
`).all();
for (const r of q4) {
  console.log(`  ${r.mode.padEnd(12)} no_crc=${String(r.no_crc).padStart(8)}%  with_crc=${String(r.with_crc).padStart(8)}%  overhead=${r.overhead}%`);
}

// Q5: 플랫폼 비교
console.log('\n=== Q5: 플랫폼 비교 (Node.js vs Python 속도) ===');
const q5 = db.prepare(`
  SELECT n.mode,
         CASE WHEN n.mode='coorddict' THEN n.dimensions ELSE NULL END as dim,
         ROUND(AVG(n.pack_ms), 2) as node_pack,
         ROUND(AVG(p.pack_ms), 2) as py_pack,
         ROUND(AVG(p.pack_ms) / NULLIF(AVG(n.pack_ms), 0), 1) as py_vs_node
  FROM benchmarks n
  JOIN benchmarks p ON n.data_type = p.data_type
                    AND n.data_size = p.data_size
                    AND n.mode = p.mode
                    AND n.crc = p.crc
                    AND COALESCE(n.dimensions, 0) = COALESCE(p.dimensions, 0)
  WHERE n.platform = 'nodejs' AND p.platform = 'python' AND n.crc = 0
  GROUP BY n.mode, dim
  ORDER BY n.mode, dim
`).all();
for (const r of q5) {
  const dim = r.dim ? ' D=' + r.dim : '';
  console.log(`  ${(r.mode + dim).padEnd(18)} Node=${String(r.node_pack).padStart(8)}ms  Python=${String(r.py_pack).padStart(8)}ms  ratio=${r.py_vs_node}x`);
}

// Q6: 대용량(>=64KB) 데이터 유형별 최적 모드
console.log('\n=== Q6: 데이터 유형별 최적 모드 (>=64KB) ===');
const q6 = db.prepare(`
  SELECT data_type, mode,
         CASE WHEN mode='coorddict' THEN dimensions ELSE NULL END as dim,
         data_size,
         ROUND(ratio, 2) as ratio
  FROM benchmarks
  WHERE platform='nodejs' AND crc=0 AND data_size >= 65536
  ORDER BY data_type, data_size, ratio DESC
`).all();
const best = {};
for (const r of q6) {
  const key = r.data_type + '/' + r.data_size;
  if (!best[key] || r.ratio > best[key].ratio) best[key] = r;
}
for (const [key, r] of Object.entries(best).sort()) {
  const dim = r.dim ? ' D=' + r.dim : '';
  console.log(`  ${r.data_type.padEnd(8)}/${sizeLabel(r.data_size).padEnd(6)} BEST=${(r.mode + dim).padEnd(18)} ratio=${r.ratio}%`);
}

// Q7: CoordDict ECC 오버헤드 수렴 (크기별)
console.log('\n=== Q7: CoordDict ECC 오버헤드 수렴 (random 기준, D=8) ===');
const q7 = db.prepare(`
  SELECT data_size,
         ROUND(ratio, 2) as coord_ratio,
         ROUND(-ratio - 14.3, 2) as gzip_overhead
  FROM benchmarks
  WHERE mode='coorddict' AND dimensions=8 AND platform='nodejs'
    AND crc=0 AND data_type='random'
  ORDER BY data_size
`).all();
for (const r of q7) {
  console.log(`  ${sizeLabel(r.data_size).padEnd(8)} ratio=${String(r.coord_ratio).padStart(8)}%  (ECC+gzip overhead: ~${(-r.coord_ratio).toFixed(1)}%)`);
}

// Q8: 전체 무결성 요약
console.log('\n=== Q8: 전체 무결성 요약 ===');
const q8 = db.prepare(`
  SELECT platform, COUNT(*) as total,
         SUM(roundtrip_ok) as passed,
         SUM(CASE WHEN roundtrip_ok=0 THEN 1 ELSE 0 END) as failed
  FROM benchmarks GROUP BY platform
`).all();
for (const r of q8) {
  console.log(`  ${r.platform}: ${r.passed}/${r.total} PASS, ${r.failed} FAIL`);
}

// Q9: Python vs Python-C vs Node.js 3-way 비교
console.log('\n=== Q9: 3-way 플랫폼 비교 (Python vs Python-C vs Node.js) ===');
const q9 = db.prepare(`
  SELECT n.mode,
         CASE WHEN n.mode='coorddict' THEN n.dimensions ELSE NULL END as dim,
         ROUND(AVG(n.pack_ms), 2) as node_pack,
         ROUND(AVG(p.pack_ms), 2) as py_pack,
         ROUND(AVG(c.pack_ms), 2) as pyc_pack,
         ROUND(AVG(p.pack_ms) / NULLIF(AVG(c.pack_ms), 0), 1) as py_vs_pyc,
         ROUND(AVG(c.pack_ms) / NULLIF(AVG(n.pack_ms), 0), 1) as pyc_vs_node
  FROM benchmarks n
  JOIN benchmarks p ON n.data_type = p.data_type
                    AND n.data_size = p.data_size
                    AND n.mode = p.mode
                    AND n.crc = p.crc
                    AND COALESCE(n.dimensions, 0) = COALESCE(p.dimensions, 0)
  JOIN benchmarks c ON n.data_type = c.data_type
                    AND n.data_size = c.data_size
                    AND n.mode = c.mode
                    AND n.crc = c.crc
                    AND COALESCE(n.dimensions, 0) = COALESCE(c.dimensions, 0)
  WHERE n.platform = 'nodejs' AND p.platform = 'python' AND c.platform = 'python-c'
    AND n.crc = 0
  GROUP BY n.mode, dim
  ORDER BY n.mode, dim
`).all();
for (const r of q9) {
  const dim = r.dim ? ' D=' + r.dim : '';
  console.log(`  ${(r.mode + dim).padEnd(18)} Node=${String(r.node_pack).padStart(8)}ms  Py=${String(r.py_pack).padStart(8)}ms  Py-C=${String(r.pyc_pack).padStart(8)}ms  Py/Py-C=${r.py_vs_pyc}x  Py-C/Node=${r.pyc_vs_node}x`);
}

// Q10: CoordDict 크기별 속도 비교 (D=8, 3-way)
console.log('\n=== Q10: CoordDict D=8 크기별 속도 비교 ===');
const q10 = db.prepare(`
  SELECT n.data_size,
         ROUND(AVG(n.pack_ms), 2) as node_ms,
         ROUND(AVG(p.pack_ms), 2) as py_ms,
         ROUND(AVG(c.pack_ms), 2) as pyc_ms,
         ROUND(AVG(p.pack_ms) / NULLIF(AVG(c.pack_ms), 0), 1) as speedup
  FROM benchmarks n
  JOIN benchmarks p ON n.data_type = p.data_type
                    AND n.data_size = p.data_size
                    AND n.mode = p.mode
                    AND n.crc = p.crc
                    AND n.dimensions = p.dimensions
  JOIN benchmarks c ON n.data_type = c.data_type
                    AND n.data_size = c.data_size
                    AND n.mode = c.mode
                    AND n.crc = c.crc
                    AND n.dimensions = c.dimensions
  WHERE n.platform='nodejs' AND p.platform='python' AND c.platform='python-c'
    AND n.mode='coorddict' AND n.dimensions=8 AND n.crc=0
  GROUP BY n.data_size
  ORDER BY n.data_size
`).all();
for (const r of q10) {
  console.log(`  ${sizeLabel(r.data_size).padEnd(8)} Node=${String(r.node_ms).padStart(8)}ms  Py=${String(r.py_ms).padStart(8)}ms  Py-C=${String(r.pyc_ms).padStart(8)}ms  speedup=${r.speedup}x`);
}

// Q11: ratio 일치 검증 (python vs python-c)
console.log('\n=== Q11: Python vs Python-C ratio 일치 검증 ===');
const q11 = db.prepare(`
  SELECT COUNT(*) as total,
         SUM(CASE WHEN ABS(p.ratio - c.ratio) < 0.01 THEN 1 ELSE 0 END) as matched
  FROM benchmarks p
  JOIN benchmarks c ON p.data_type = c.data_type
                    AND p.data_size = c.data_size
                    AND p.mode = c.mode
                    AND p.crc = c.crc
                    AND COALESCE(p.dimensions, 0) = COALESCE(c.dimensions, 0)
  WHERE p.platform='python' AND c.platform='python-c'
`).get();
console.log(`  ratio 일치: ${q11.matched}/${q11.total} (${q11.matched === q11.total ? 'PERFECT' : 'MISMATCH'})`);

db.close();
