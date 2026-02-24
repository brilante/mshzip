/**
 * 3D 도형 뷰어 - ToolBase 기반
 * Canvas 기반 3D 와이어프레임 렌더링
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ModelViewer = class ModelViewer extends ToolBase {
  constructor() {
    super('ModelViewer');
    this.canvas = null;
    this.ctx = null;
    this.rotateX = -0.5;
    this.rotateY = 0.5;
    this.isRotating = true;
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.shapes = {
      cube: {
        vertices: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
        edges: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
      },
      pyramid: {
        vertices: [[0,1,0],[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]],
        edges: [[0,1],[0,2],[0,3],[0,4],[1,2],[2,3],[3,4],[4,1]]
      },
      octahedron: {
        vertices: [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]],
        edges: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[4,3],[3,5],[5,2]]
      },
      prism: {
        vertices: [[0,1,-1],[-1,-1,-1],[1,-1,-1],[0,1,1],[-1,-1,1],[1,-1,1]],
        edges: [[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]]
      }
    };
  }

  init() {
    this.initElements({
      canvas3d: 'canvas3d',
      bgColor: 'bgColor',
      wireColor: 'wireColor',
      scale: 'scale',
      shapeSelect: 'shapeSelect'
    });

    this.canvas = this.elements.canvas3d;
    this.ctx = this.canvas.getContext('2d');
    this.setupEvents();
    this.animate();

    console.log('[ModelViewer] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.on(this.canvas, 'mousedown', (e) => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    this.on(document, 'mousemove', (e) => {
      if (this.isDragging) {
        this.rotateY += (e.clientX - this.lastX) * 0.01;
        this.rotateX += (e.clientY - this.lastY) * 0.01;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });

    this.on(document, 'mouseup', () => { this.isDragging = false; });
  }

  animate() {
    if (this.isRotating && !this.isDragging) {
      this.rotateY += 0.01;
    }
    this.render();
    requestAnimationFrame(() => this.animate());
  }

  render() {
    const bgColor = this.elements.bgColor.value;
    const wireColor = this.elements.wireColor.value;
    const scale = parseInt(this.elements.scale.value);
    const shape = this.shapes[this.elements.shapeSelect.value];

    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const projected = shape.vertices.map(v => {
      let [x, y, z] = v;
      let cosX = Math.cos(this.rotateX), sinX = Math.sin(this.rotateX);
      let cosY = Math.cos(this.rotateY), sinY = Math.sin(this.rotateY);

      let y1 = y * cosX - z * sinX;
      let z1 = y * sinX + z * cosX;
      let x1 = x * cosY + z1 * sinY;
      let z2 = -x * sinY + z1 * cosY;

      const fov = 300;
      const depth = fov / (fov + z2 * scale);
      return { x: centerX + x1 * scale * depth, y: centerY + y1 * scale * depth };
    });

    this.ctx.strokeStyle = wireColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    shape.edges.forEach(([a, b]) => {
      this.ctx.moveTo(projected[a].x, projected[a].y);
      this.ctx.lineTo(projected[b].x, projected[b].y);
    });
    this.ctx.stroke();

    projected.forEach(p => {
      this.ctx.fillStyle = wireColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  changeShape() {
    this.render();
  }

  resetView() {
    this.rotateX = -0.5;
    this.rotateY = 0.5;
    this.showToast('뷰가 초기화되었습니다', 'success');
  }

  toggleRotation() {
    this.isRotating = !this.isRotating;
    this.showToast(this.isRotating ? '자동 회전 켜짐' : '자동 회전 꺼짐', 'success');
  }

  exportImage() {
    const link = document.createElement('a');
    link.href = this.canvas.toDataURL('image/png');
    link.download = '3d-shape.png';
    link.click();
    this.showToast('이미지 다운로드 시작!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const modelViewer = new ModelViewer();
window.ModelViewer = modelViewer;

document.addEventListener('DOMContentLoaded', () => modelViewer.init());
