const fs = require('fs');
const jsonPath = 'G:\\MyWrok\\mymind3\\save\\JDJiJDEwJFFHcE9Tc3pkWkl2bDZncjVKWm5pdmVjVnR2bXEvbXguNDVURnVVQ2JzTFVxcklnOVVlL1NXUeWah5faIQcX66ccmeX4\\개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1\\개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1.json';

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// 트리에서 모든 노드 ID와 title 출력 (depth 2까지)
function printTree(node, depth) {
  if (depth > 2) return;
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.id}: ${node.title} (children: ${(node.children||[]).length})`);
  if (node.children) {
    for (const child of node.children) {
      printTree(child, depth + 1);
    }
  }
}

printTree(data, 0);

// 또한 3ZOZ를 포함하는 노드 검색
function findAll(node, results) {
  if (node.id && node.id.includes('3ZOZ')) results.push({ id: node.id, title: node.title });
  if (node.title && node.title.includes('검토')) results.push({ id: node.id, title: node.title });
  if (node.children) {
    for (const child of node.children) findAll(child, results);
  }
}

const results = [];
findAll(data, results);
console.log('\n검색 결과 (3ZOZ 또는 검토):', JSON.stringify(results, null, 2));
