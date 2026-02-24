/**
 * 3ZOZ5OWF2H (검토 2) 하위에 8개 노드 추가
 */
const fs = require('fs');
const path = require('path');

const jsonPath = 'G:\\MyWrok\\mymind3\\save\\JDJiJDEwJFFHcE9Tc3pkWkl2bDZncjVKWm5pdmVjVnR2bXEvbXguNDVURnVVQ2JzTFVxcklnOVVlL1NXUeWah5faIQcX66ccmeX4\\개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1\\개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1.json';

function genNodeId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function findNode(node, nodeId) {
  if (node.nodeId === nodeId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

function getMaxId(node, max) {
  max = Math.max(max, node.id || 0);
  if (node.children) {
    for (const child of node.children) {
      max = getMaxId(child, max);
    }
  }
  return max;
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const root = data.mindMapData[0];
const target = findNode(root, '3ZOZ5OWF2H');

if (!target) {
  console.error('3ZOZ5OWF2H 노드를 찾을 수 없습니다');
  process.exit(1);
}

console.log('Found:', target.title, '(id:', target.id, ', nodeId:', target.nodeId, ')');
console.log('Current children:', (target.children || []).length);

let nextId = data.nextNodeId || getMaxId(root, 0) + 1;

// 8개 하위 노드 정의
const childDefs = [
  '전체 아키텍처',
  '마인드맵 사전 등록',
  '명령 저장 시스템',
  '명령 평가 체계',
  '동적 규칙 로딩',
  'CC 관리 통합',
  '구현 요구사항',
  '실현 가능성 결론'
];

target.children = target.children || [];
const nodeIds = [];

for (const title of childDefs) {
  const nodeId = genNodeId();
  const node = {
    id: nextId++,
    nodeId: nodeId,
    title: title,
    parentId: target.id,
    level: (target.level || 0) + 1,
    x: 0,
    y: 0,
    expanded: true,
    path: '',
    checked: false,
    children: [],
    importance: 0,
    evaluationReason: '',
    qaFiles: []
  };
  target.children.push(node);
  nodeIds.push({ id: nodeId, title: title });
}

data.nextNodeId = nextId;
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');

console.log('\n추가된 노드:');
nodeIds.forEach(n => console.log(`  ${n.id}: ${n.title}`));
console.log('\nnextNodeId:', nextId);

// 노드 ID 목록 저장
fs.writeFileSync(
  path.join(__dirname, 'review2-node-ids.json'),
  JSON.stringify(nodeIds, null, 2),
  'utf-8'
);
console.log('\n완료: review2-node-ids.json 저장됨');
