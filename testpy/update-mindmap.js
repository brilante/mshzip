'use strict';
const fs = require('fs');
const path = require('path');

const SAVE_DIR = 'G:/MyWrok/mymind3/save/JDJiJDEwJFFHcE9Tc3pkWkl2bDZncjVKWm5pdmVjVnR2bXEvbXguNDVURnVVQ2JzTFVxcklnOVVlL1NXUeWah5faIQcX66ccmeX4';
const MM_DIR = path.join(SAVE_DIR, '개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1');
const jsonFiles = fs.readdirSync(MM_DIR).filter(f => f.endsWith('.json'));
const jsonFile = path.join(MM_DIR, jsonFiles[0]);

const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));

function findNode(node, targetId) {
  if (node.nodeId === targetId) return node;
  for (const child of (node.children || [])) {
    const r = findNode(child, targetId);
    if (r) return r;
  }
  return null;
}

const root = data.mindMapData[0];
const target = findNode(root, 'G6QN2ANDB1');
if (target === null) {
  console.log('ERROR: G6QN2ANDB1 not found');
  process.exit(1);
}

let nextId = data.nextNodeId || 56;
const baseX = target.x + 260;
let yPos = target.y - 300;

const phases = [
  { nodeId: 'SM4PO4TQ03', title: 'Phase0 점검: 목표 수립', children: [
    { nodeId: 'TUMDU3DY2V', title: 'PASS: CLAUDE.md 검증 규칙' },
    { nodeId: '0GJYPVW1P6', title: 'WARN: Plan Mode 지표 수립' },
    { nodeId: '0GFRPAUNM6', title: 'PASS: Ralph Loop 탈출조건' }
  ]},
  { nodeId: 'GD4PMGF87W', title: 'Phase1 점검: 프롬프트 구조화', children: [
    { nodeId: 'GV4DO603FL', title: 'PASS: Rules 분산 시스템' },
    { nodeId: 'NSX2TNVN4E', title: 'WARN: Skills 역할 전문화' },
    { nodeId: '10TX8XRPSA', title: 'WARN: Hooks 스키마 검증' }
  ]},
  { nodeId: '7190U3AHLY', title: 'Phase2 점검: 컨텍스트 관리', children: [
    { nodeId: 'AZCD6OA59V', title: 'FAIL: Memory 컨텍스트 압축' },
    { nodeId: 'RAYJWUATJF', title: 'PASS: Subagent 컨텍스트 격리' },
    { nodeId: 'CKSUHXPHEQ', title: 'PASS: Context7 + Glob/Grep' }
  ]},
  { nodeId: '44Z3NRH8HM', title: 'Phase3 점검: 도구/에이전트', children: [
    { nodeId: 'ERU8SDCLHF', title: 'FAIL: MCP 도구 표준화' },
    { nodeId: '6JFQ3YUPI6', title: 'PASS: Ralph 무한루프 방지' },
    { nodeId: 'FVB8U8B2XL', title: 'PASS: PreToolUse 권한 게이트' }
  ]},
  { nodeId: 'AMOG8PVDBP', title: 'Phase4 점검: 평가/디버깅', children: [
    { nodeId: 'L4UH6SB4FV', title: 'PASS: 팀즈 병렬 평가' },
    { nodeId: 'LR9NR395U1', title: 'WARN: Hook 기반 관측성' },
    { nodeId: 'POJ64C57MG', title: 'FAIL: PR Review 실험 관리' }
  ]},
  { nodeId: 'THGY8C2FN6', title: 'Phase5 점검: 운영 안정화', children: [
    { nodeId: 'O8N9PFIYPG', title: 'WARN: Memory 지식 보존' },
    { nodeId: 'Y9J0FRFEO5', title: 'PASS: 모델 선택 비용 최적화' },
    { nodeId: 'DKP9A6XH83', title: 'WARN: 3중 보안 체계' },
    { nodeId: 'TAE1606DND', title: 'WARN: AskUserQuestion HiTL' }
  ]}
];

const phaseChildren = [];
for (const phase of phases) {
  const phaseNode = {
    id: nextId++,
    nodeId: phase.nodeId,
    title: phase.title,
    parentId: target.id,
    level: target.level + 1,
    x: baseX,
    y: yPos,
    children: [],
    expanded: false,
    path: phase.title + '[' + phase.nodeId + '].html',
    checked: true
  };

  const childX = baseX + 260;
  let childY = yPos - (phase.children.length - 1) * 30;
  for (const feat of phase.children) {
    phaseNode.children.push({
      id: nextId++,
      nodeId: feat.nodeId,
      title: feat.title,
      parentId: phaseNode.id,
      level: phaseNode.level + 1,
      x: childX,
      y: childY,
      children: [],
      expanded: false,
      path: feat.title + '[' + feat.nodeId + '].html',
      checked: true
    });
    childY += 60;
  }

  phaseChildren.push(phaseNode);
  yPos += 200;
}

target.children = phaseChildren;
data.nextNodeId = nextId;

// 백업 후 저장
fs.copyFileSync(jsonFile, jsonFile + '.bak');
fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf-8');
console.log('구조 업데이트 완료. nextNodeId:', nextId);
console.log('추가 노드: Phase 6개 + Feature 19개 = 25개');
