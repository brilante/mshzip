/**
 * 3D 큐브 생성기 - ToolBase 기반
 * CSS 3D 큐브 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Cube3D = class Cube3D extends ToolBase {
  constructor() {
    super('Cube3D');
  }

  init() {
    this.initElements({
      cube: 'cube',
      cubeSize: 'cubeSize',
      rotateX: 'rotateX',
      rotateY: 'rotateY',
      rotateZ: 'rotateZ',
      autoRotate: 'autoRotate',
      cubeSizeValue: 'cubeSizeValue',
      rotateXValue: 'rotateXValue',
      rotateYValue: 'rotateYValue',
      rotateZValue: 'rotateZValue',
      colorFront: 'colorFront',
      colorBack: 'colorBack',
      colorRight: 'colorRight',
      colorLeft: 'colorLeft',
      colorTop: 'colorTop',
      colorBottom: 'colorBottom'
    });

    this.update();
    console.log('[Cube3D] 초기화 완료');
    return this;
  }

  update() {
    const size = this.elements.cubeSize.value;
    const rotateX = this.elements.rotateX.value;
    const rotateY = this.elements.rotateY.value;
    const rotateZ = this.elements.rotateZ.value;

    this.elements.cubeSizeValue.textContent = size + 'px';
    this.elements.rotateXValue.textContent = rotateX + '°';
    this.elements.rotateYValue.textContent = rotateY + '°';
    this.elements.rotateZValue.textContent = rotateZ + '°';

    const cube = this.elements.cube;
    const halfSize = size / 2;

    cube.style.width = size + 'px';
    cube.style.height = size + 'px';

    if (!this.elements.autoRotate.checked) {
      cube.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    }

    const faces = cube.querySelectorAll('.face');
    faces.forEach(face => {
      if (face.classList.contains('front')) face.style.transform = `translateZ(${halfSize}px)`;
      if (face.classList.contains('back')) face.style.transform = `rotateY(180deg) translateZ(${halfSize}px)`;
      if (face.classList.contains('right')) face.style.transform = `rotateY(90deg) translateZ(${halfSize}px)`;
      if (face.classList.contains('left')) face.style.transform = `rotateY(-90deg) translateZ(${halfSize}px)`;
      if (face.classList.contains('top')) face.style.transform = `rotateX(90deg) translateZ(${halfSize}px)`;
      if (face.classList.contains('bottom')) face.style.transform = `rotateX(-90deg) translateZ(${halfSize}px)`;
    });

    cube.querySelector('.front').style.background = this.elements.colorFront.value;
    cube.querySelector('.back').style.background = this.elements.colorBack.value;
    cube.querySelector('.right').style.background = this.elements.colorRight.value;
    cube.querySelector('.left').style.background = this.elements.colorLeft.value;
    cube.querySelector('.top').style.background = this.elements.colorTop.value;
    cube.querySelector('.bottom').style.background = this.elements.colorBottom.value;
  }

  toggleAnimation() {
    const cube = this.elements.cube;
    const autoRotate = this.elements.autoRotate.checked;
    if (autoRotate) {
      cube.classList.add('animating');
      cube.style.transform = '';
    } else {
      cube.classList.remove('animating');
      this.update();
    }
  }

  async copyCSS() {
    const size = this.elements.cubeSize.value;
    const halfSize = size / 2;
    const colors = {
      front: this.elements.colorFront.value,
      back: this.elements.colorBack.value,
      right: this.elements.colorRight.value,
      left: this.elements.colorLeft.value,
      top: this.elements.colorTop.value,
      bottom: this.elements.colorBottom.value
    };

    const css = `.scene { perspective: 800px; }
.cube {
  width: ${size}px;
  height: ${size}px;
  position: relative;
  transform-style: preserve-3d;
}
.face {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,0.3);
}
.front { background: ${colors.front}; transform: translateZ(${halfSize}px); }
.back { background: ${colors.back}; transform: rotateY(180deg) translateZ(${halfSize}px); }
.right { background: ${colors.right}; transform: rotateY(90deg) translateZ(${halfSize}px); }
.left { background: ${colors.left}; transform: rotateY(-90deg) translateZ(${halfSize}px); }
.top { background: ${colors.top}; transform: rotateX(90deg) translateZ(${halfSize}px); }
.bottom { background: ${colors.bottom}; transform: rotateX(-90deg) translateZ(${halfSize}px); }`;

    try {
      await navigator.clipboard.writeText(css);
      this.showToast('CSS가 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  async copyHTML() {
    const html = `<div class="scene">
  <div class="cube">
    <div class="face front">앞</div>
    <div class="face back">뒤</div>
    <div class="face right">오른쪽</div>
    <div class="face left">왼쪽</div>
    <div class="face top">위</div>
    <div class="face bottom">아래</div>
  </div>
</div>`;

    try {
      await navigator.clipboard.writeText(html);
      this.showToast('HTML이 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const cube3D = new Cube3D();
window.Cube3D = cube3D;

document.addEventListener('DOMContentLoaded', () => cube3D.init());
