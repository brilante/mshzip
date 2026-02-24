/**
 * 플로우차트 생성기 - ToolBase 기반
 * 드래그 앤 드롭으로 플로우차트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FlowchartGen extends ToolBase {
  constructor() {
    super('FlowchartGen');
    this.nodes = [];
    this.connections = [];
    this.selectedNode = null;
    this.draggingNode = null;
    this.offset = { x: 0, y: 0 };
  }

  init() {
    this.initElements({
      canvas: 'flowchartCanvas',
      propertiesPanel: 'propertiesPanel',
      shapeText: 'shapeText',
      shapeColor: 'shapeColor'
    });

    this.setupDragAndDrop();
    this.setupCanvasEvents();
    this.createInitialDemo();

    console.log('[FlowchartGen] 초기화 완료');
    return this;
  }

  setupDragAndDrop() {
    document.querySelectorAll('.shape-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('shape', item.dataset.shape);
      });
    });

    this.on(this.elements.canvas, 'dragover', (e) => e.preventDefault());
    this.on(this.elements.canvas, 'drop', (e) => {
      e.preventDefault();
      const shape = e.dataTransfer.getData('shape');
      if (!shape) return;

      const rect = this.elements.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.createNode(shape, x, y);
    });
  }

  setupCanvasEvents() {
    this.on(this.elements.canvas, 'mousemove', (e) => {
      if (!this.draggingNode) return;
      const rect = this.elements.canvas.getBoundingClientRect();
      this.draggingNode.x = e.clientX - rect.left - this.offset.x;
      this.draggingNode.y = e.clientY - rect.top - this.offset.y;
      this.renderNodes();
    });

    this.on(this.elements.canvas, 'mouseup', () => {
      this.draggingNode = null;
    });
  }

  createNode(shape, x, y, text = '텍스트') {
    const id = 'node-' + Date.now();
    const node = { id, shape, x, y, text, color: this.getShapeColor(shape) };
    this.nodes.push(node);
    this.renderNodes();
    return node;
  }

  getShapeColor(shape) {
    const colors = { rect: '#4A90D9', diamond: '#F5A623', oval: '#7ED321', parallelogram: '#BD10E0' };
    return colors[shape] || '#4A90D9';
  }

  renderNodes() {
    const canvas = this.elements.canvas;
    // Clear existing nodes (keep defs)
    canvas.querySelectorAll('.node, .connection').forEach(el => el.remove());

    // Render connections
    this.connections.forEach(conn => {
      const from = this.nodes.find(n => n.id === conn.from);
      const to = this.nodes.find(n => n.id === conn.to);
      if (from && to) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'connection');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y + 20);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y - 20);
        line.setAttribute('stroke', '#666');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        canvas.appendChild(line);
      }
    });

    // Render nodes
    this.nodes.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node' + (this.selectedNode === node ? ' selected' : ''));
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      g.dataset.id = node.id;

      let shape;
      switch (node.shape) {
        case 'rect':
          shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          shape.setAttribute('x', '-60');
          shape.setAttribute('y', '-25');
          shape.setAttribute('width', '120');
          shape.setAttribute('height', '50');
          shape.setAttribute('rx', '5');
          break;
        case 'diamond':
          shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          shape.setAttribute('points', '0,-35 60,0 0,35 -60,0');
          break;
        case 'oval':
          shape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
          shape.setAttribute('rx', '50');
          shape.setAttribute('ry', '25');
          break;
        case 'parallelogram':
          shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          shape.setAttribute('points', '-50,-25 70,-25 50,25 -70,25');
          break;
      }

      shape.setAttribute('fill', node.color);
      g.appendChild(shape);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', '5');
      text.setAttribute('fill', 'white');
      text.setAttribute('font-size', '14');
      text.textContent = node.text;
      g.appendChild(text);

      g.addEventListener('mousedown', (e) => this.startDrag(e, node));
      g.addEventListener('click', () => this.selectNode(node));
      g.addEventListener('dblclick', () => {
        const newText = prompt('텍스트 입력:', node.text);
        if (newText !== null) {
          node.text = newText;
          this.renderNodes();
        }
      });

      canvas.appendChild(g);
    });
  }

  startDrag(e, node) {
    this.draggingNode = node;
    const rect = this.elements.canvas.getBoundingClientRect();
    this.offset.x = e.clientX - rect.left - node.x;
    this.offset.y = e.clientY - rect.top - node.y;
    e.preventDefault();
  }

  selectNode(node) {
    this.selectedNode = node;
    this.elements.propertiesPanel.style.display = 'block';
    this.elements.shapeText.value = node.text;
    this.elements.shapeColor.value = node.color;
    this.renderNodes();
  }

  updateSelectedShape() {
    if (!this.selectedNode) return;
    this.selectedNode.text = this.elements.shapeText.value;
    this.selectedNode.color = this.elements.shapeColor.value;
    this.renderNodes();
  }

  deleteSelected() {
    if (!this.selectedNode) return;
    this.nodes = this.nodes.filter(n => n.id !== this.selectedNode.id);
    this.connections = this.connections.filter(c => c.from !== this.selectedNode.id && c.to !== this.selectedNode.id);
    this.selectedNode = null;
    this.elements.propertiesPanel.style.display = 'none';
    this.renderNodes();
  }

  clearCanvas() {
    if (confirm('모든 노드를 삭제하시겠습니까?')) {
      this.nodes = [];
      this.connections = [];
      this.selectedNode = null;
      this.elements.propertiesPanel.style.display = 'none';
      this.renderNodes();
    }
  }

  async exportImage() {
    const canvas = this.elements.canvas;
    const svgData = new XMLSerializer().serializeToString(canvas);
    const canvas2d = document.createElement('canvas');
    const ctx = canvas2d.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas2d.width = canvas.clientWidth * 2;
      canvas2d.height = canvas.clientHeight * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas2d.width, canvas2d.height);
      ctx.drawImage(img, 0, 0, canvas2d.width, canvas2d.height);
      const a = document.createElement('a');
      a.href = canvas2d.toDataURL('image/png');
      a.download = 'flowchart.png';
      a.click();
      this.showToast('이미지 다운로드 시작!', 'success');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  createInitialDemo() {
    this.createNode('oval', 400, 50, '시작');
    this.createNode('rect', 400, 150, '프로세스');
    this.createNode('diamond', 400, 280, '조건?');
    this.createNode('rect', 250, 400, '예');
    this.createNode('rect', 550, 400, '아니오');
    this.createNode('oval', 400, 520, '종료');

    this.nodes[0].id = 'node-1';
    this.nodes[1].id = 'node-2';
    this.nodes[2].id = 'node-3';
    this.nodes[3].id = 'node-4';
    this.nodes[4].id = 'node-5';
    this.nodes[5].id = 'node-6';

    this.connections = [
      { from: 'node-1', to: 'node-2' },
      { from: 'node-2', to: 'node-3' },
      { from: 'node-3', to: 'node-4' },
      { from: 'node-3', to: 'node-5' },
      { from: 'node-4', to: 'node-6' },
      { from: 'node-5', to: 'node-6' }
    ];

    this.renderNodes();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const flowchartGen = new FlowchartGen();
window.FlowchartGen = flowchartGen;

document.addEventListener('DOMContentLoaded', () => flowchartGen.init());
