/**
 * 가구 배치 도우미 - ToolBase 기반
 * 방 크기에 맞는 가구 배치
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FurniturePlanner = class FurniturePlanner extends ToolBase {
  constructor() {
    super('FurniturePlanner');
    this.placedFurniture = [];
    this.scale = 80; // px per meter
    this.dragging = null;
    this.offset = { x: 0, y: 0 };
    this.furniture = [
      { name: '싱글 침대', width: 1.0, height: 2.0, icon: '' },
      { name: '더블 침대', width: 1.4, height: 2.0, icon: '' },
      { name: '퀸 침대', width: 1.5, height: 2.0, icon: '' },
      { name: '2인 소파', width: 1.6, height: 0.9, icon: '' },
      { name: '3인 소파', width: 2.2, height: 0.9, icon: '' },
      { name: '식탁 4인', width: 1.2, height: 0.8, icon: '' },
      { name: '식탁 6인', width: 1.8, height: 0.9, icon: '' },
      { name: '책상', width: 1.2, height: 0.6, icon: '' },
      { name: '옷장', width: 1.2, height: 0.6, icon: '' },
      { name: 'TV 스탠드', width: 1.5, height: 0.4, icon: '' },
      { name: '서랍장', width: 0.8, height: 0.4, icon: '' },
      { name: '협탁', width: 0.5, height: 0.4, icon: '' },
      { name: '의자', width: 0.5, height: 0.5, icon: '' },
      { name: '북셀프', width: 0.8, height: 0.3, icon: '' }
    ];
  }

  init() {
    this.initElements({
      furnitureList: 'furnitureList',
      roomWidth: 'roomWidth',
      roomHeight: 'roomHeight',
      roomCanvas: 'roomCanvas',
      gridOverlay: 'gridOverlay',
      furnitureContainer: 'furnitureContainer',
      placedList: 'placedList'
    });

    this.renderFurnitureList();
    this.updateRoom();
    this.setupDrag();

    console.log('[FurniturePlanner] 초기화 완료');
    return this;
  }

  renderFurnitureList() {
    this.elements.furnitureList.innerHTML = this.furniture.map((f, idx) => `
      <div class="furniture-item" onclick="furniturePlanner.addFurniture(${idx})">
        <div>
          <span>${f.icon}</span>
          <span class="furniture-name">${f.name}</span>
        </div>
        <span class="furniture-size">${f.width}×${f.height}m</span>
      </div>
    `).join('');
  }

  updateRoom() {
    const roomWidth = parseFloat(this.elements.roomWidth.value) || 4;
    const roomHeight = parseFloat(this.elements.roomHeight.value) || 3;

    const canvas = this.elements.roomCanvas;
    const maxWidth = canvas.parentElement.offsetWidth - 280;

    // 스케일 조정
    this.scale = Math.min(80, maxWidth / roomWidth);

    canvas.style.width = (roomWidth * this.scale) + 'px';
    canvas.style.height = (roomHeight * this.scale) + 'px';

    // 그리드 업데이트 (50cm 간격)
    const gridSize = this.scale * 0.5;
    this.elements.gridOverlay.style.backgroundSize = `${gridSize}px ${gridSize}px`;

    this.renderPlacedFurniture();
  }

  addFurniture(idx) {
    const f = this.furniture[idx];
    const roomWidth = parseFloat(this.elements.roomWidth.value) || 4;
    const roomHeight = parseFloat(this.elements.roomHeight.value) || 3;

    // 중앙에 배치
    const x = (roomWidth - f.width) / 2;
    const y = (roomHeight - f.height) / 2;

    this.placedFurniture.push({
      id: Date.now(),
      ...f,
      x: Math.max(0, x),
      y: Math.max(0, y)
    });

    this.renderPlacedFurniture();
    this.renderPlacedList();
  }

  removeFurniture(id) {
    this.placedFurniture = this.placedFurniture.filter(f => f.id !== id);
    this.renderPlacedFurniture();
    this.renderPlacedList();
  }

  renderPlacedFurniture() {
    this.elements.furnitureContainer.innerHTML = this.placedFurniture.map(f => `
      <div class="placed-furniture"
           data-id="${f.id}"
           style="left: ${f.x * this.scale}px; top: ${f.y * this.scale}px; width: ${f.width * this.scale}px; height: ${f.height * this.scale}px;">
        <span>${f.icon}</span>
      </div>
    `).join('');
  }

  renderPlacedList() {
    if (this.placedFurniture.length === 0) {
      this.elements.placedList.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-secondary);">가구를 배치하세요</div>';
      return;
    }

    this.elements.placedList.innerHTML = this.placedFurniture.map(f => `
      <div class="placed-item">
        <span>${f.icon} ${f.name}</span>
        <button onclick="furniturePlanner.removeFurniture(${f.id})" style="background: none; border: none; cursor: pointer; opacity: 0.6;"></button>
      </div>
    `).join('');
  }

  setupDrag() {
    const canvas = this.elements.roomCanvas;

    this.on(canvas, 'mousedown', (e) => {
      const target = e.target.closest('.placed-furniture');
      if (!target) return;

      const id = parseInt(target.dataset.id);
      this.dragging = this.placedFurniture.find(f => f.id === id);

      if (this.dragging) {
        const rect = target.getBoundingClientRect();
        this.offset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        target.style.zIndex = 100;
      }
    });

    this.on(document, 'mousemove', (e) => {
      if (!this.dragging) return;

      const canvasRect = canvas.getBoundingClientRect();
      const roomWidth = parseFloat(this.elements.roomWidth.value) || 4;
      const roomHeight = parseFloat(this.elements.roomHeight.value) || 3;

      let x = (e.clientX - canvasRect.left - this.offset.x) / this.scale;
      let y = (e.clientY - canvasRect.top - this.offset.y) / this.scale;

      // 경계 체크
      x = Math.max(0, Math.min(x, roomWidth - this.dragging.width));
      y = Math.max(0, Math.min(y, roomHeight - this.dragging.height));

      // 스냅 (0.1m 단위)
      x = Math.round(x * 10) / 10;
      y = Math.round(y * 10) / 10;

      this.dragging.x = x;
      this.dragging.y = y;

      this.renderPlacedFurniture();
    });

    this.on(document, 'mouseup', () => {
      this.dragging = null;
    });
  }

  clearAll() {
    this.placedFurniture = [];
    this.renderPlacedFurniture();
    this.renderPlacedList();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const furniturePlanner = new FurniturePlanner();
window.FurniturePlanner = furniturePlanner;

document.addEventListener('DOMContentLoaded', () => furniturePlanner.init());
