'use strict';

/**
 * 도구 카테고리 관리 모델
 * All-in-One 도구 허브의 카테고리 관리
 * 참고소스(mymind3) 동등 구현. SQL 플레이스홀더: $1, $2... (PostgreSQL)
 *
 * @module db/models/ToolCategory
 */

const db = require('..');

// 기본 카테고리 데이터 (프리미엄 + 기존 카테고리)
const DEFAULT_CATEGORIES = [
  // 프리미엄 카테고리 (서버 고연산 도구)
  { id: 'premium', name: '프리미엄', icon: '', color: '#FFD700', sortOrder: 0, isPremium: true },
  { id: 'document', name: '문서 변환', icon: '', color: '#9b59b6', sortOrder: 1, isPremium: false },
  { id: 'image', name: '이미지 도구', icon: '', color: '#3498db', sortOrder: 2, isPremium: false },
  { id: 'media', name: '비디오/오디오', icon: '', color: '#e74c3c', sortOrder: 3, isPremium: false },
  { id: 'text', name: '텍스트/글쓰기', icon: '', color: '#2ecc71', sortOrder: 4, isPremium: false },
  { id: 'developer', name: '개발자 도구', icon: '', color: '#34495e', sortOrder: 5, isPremium: false },
  { id: 'data-convert', name: '데이터 변환', icon: '', color: '#1abc9c', sortOrder: 6, isPremium: false },
  { id: 'qr', name: 'QR 코드', icon: '', color: '#95a5a6', sortOrder: 7, isPremium: false },
  { id: 'seo', name: 'SEO 도구', icon: '', color: '#f39c12', sortOrder: 8, isPremium: false },
  { id: 'calculator', name: '계산기', icon: '', color: '#8e44ad', sortOrder: 9, isPremium: false },
  { id: 'design', name: '디자인 도구', icon: '', color: '#e91e63', sortOrder: 10, isPremium: false },
  { id: 'business', name: '비즈니스', icon: '', color: '#00bcd4', sortOrder: 11, isPremium: false },
  { id: 'security', name: '보안 도구', icon: '', color: '#607d8b', sortOrder: 12, isPremium: false },
  { id: 'network', name: '네트워크', icon: '', color: '#4caf50', sortOrder: 13, isPremium: false },
  { id: 'social', name: '소셜 미디어', icon: '', color: '#ff5722', sortOrder: 14, isPremium: false },
  { id: 'ai-voice', name: 'AI 음성', icon: '', color: '#9c27b0', sortOrder: 15, isPremium: true },
  { id: 'ai-image', name: 'AI 이미지', icon: '', color: '#673ab7', sortOrder: 16, isPremium: true },
  { id: 'ai-text', name: 'AI 텍스트', icon: '', color: '#3f51b5', sortOrder: 17, isPremium: true },
  { id: 'game', name: '게임/랜덤', icon: '', color: '#ff9800', sortOrder: 18, isPremium: false },
  { id: 'education', name: '교육 도구', icon: '', color: '#795548', sortOrder: 19, isPremium: false },
  { id: 'health', name: '건강/웰니스', icon: '', color: '#f44336', sortOrder: 20, isPremium: false },
  { id: 'language', name: '언어/번역', icon: '', color: '#00bcd4', sortOrder: 21, isPremium: false },
  { id: 'finance', name: '금융/부동산', icon: '', color: '#4caf50', sortOrder: 22, isPremium: false },
  { id: 'marketing', name: '마케팅/분석', icon: '', color: '#e91e63', sortOrder: 23, isPremium: false },
  { id: 'productivity', name: '생산성', icon: '', color: '#009688', sortOrder: 24, isPremium: false },
  { id: 'legal', name: '법률/계약', icon: '', color: '#5c6bc0', sortOrder: 25, isPremium: false },
  { id: 'travel', name: '여행', icon: '', color: '#03a9f4', sortOrder: 26, isPremium: false },
  { id: 'cooking', name: '요리/레시피', icon: '', color: '#ff5722', sortOrder: 27, isPremium: false },
  { id: 'pet', name: '펫/반려동물', icon: '', color: '#8B4513', sortOrder: 28, isPremium: false },
  { id: 'diy', name: 'DIY/홈', icon: '', color: '#DAA520', sortOrder: 29, isPremium: false },
  { id: 'utility', name: '유틸리티', icon: '', color: '#607d8b', sortOrder: 30, isPremium: false },
  { id: 'sports', name: '스포츠/피트니스', icon: '', color: '#4caf50', sortOrder: 31, isPremium: false },
  { id: 'music', name: '음악/악기', icon: '', color: '#9c27b0', sortOrder: 32, isPremium: false },
  { id: 'automotive', name: '자동차/운전', icon: '', color: '#607d8b', sortOrder: 33, isPremium: false },
  { id: 'parenting', name: '부모/육아', icon: '', color: '#ec4899', sortOrder: 34, isPremium: false },
  { id: 'fashion', name: '패션/뷰티', icon: '', color: '#f472b6', sortOrder: 35, isPremium: false },
  { id: 'student', name: '학생/학업', icon: '', color: '#6366f1', sortOrder: 36, isPremium: false },
  { id: 'eco', name: '환경/지속가능성', icon: '', color: '#22c55e', sortOrder: 37, isPremium: false },
  { id: 'visualization', name: '데이터 시각화', icon: '', color: '#8b5cf6', sortOrder: 38, isPremium: false },
  { id: 'ebook', name: '전자책/출판', icon: '', color: '#f59e0b', sortOrder: 39, isPremium: false }
];

/**
 * 도구 카테고리 모델
 */
const ToolCategory = {
  /**
   * 테이블 초기화
   */
  async initTable() {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tool_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '',
        color TEXT DEFAULT '#667eea',
        sort_order INTEGER DEFAULT 0,
        is_premium INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[ToolCategory] 테이블 초기화 완료');
  },

  /**
   * 기본 카테고리 데이터 삽입
   */
  async seedDefaultCategories() {
    const existing = await db.get('SELECT COUNT(*) as count FROM tool_categories');

    if (Number(existing.count) === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await db.run(`
          INSERT INTO tool_categories (id, name, icon, color, sort_order, is_premium)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [cat.id, cat.name, cat.icon, cat.color, cat.sortOrder, cat.isPremium ? 1 : 0]);
      }
      console.log(`[ToolCategory] ${DEFAULT_CATEGORIES.length}개 기본 카테고리 삽입`);
    }
  },

  /**
   * 모든 카테고리 조회
   */
  async getAll() {
    return db.all(`
      SELECT id, name, icon, color, sort_order as "sortOrder",
             is_premium as "isPremium", is_active as "isActive"
      FROM tool_categories
      WHERE is_active = 1
      ORDER BY sort_order ASC
    `);
  },

  /**
   * 카테고리 ID로 조회
   */
  async getById(categoryId) {
    return db.get(`
      SELECT id, name, icon, color, sort_order as "sortOrder",
             is_premium as "isPremium", is_active as "isActive"
      FROM tool_categories
      WHERE id = $1
    `, [categoryId]);
  },

  /**
   * 카테고리 생성
   */
  async create(category) {
    const result = await db.run(`
      INSERT INTO tool_categories (id, name, icon, color, sort_order, is_premium)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      category.id,
      category.name,
      category.icon || '',
      category.color || '#667eea',
      category.sortOrder || 0,
      category.isPremium ? 1 : 0
    ]);
    return result.changes > 0 ? category : null;
  },

  /**
   * 카테고리 수정
   */
  async update(categoryId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
    if (updates.icon !== undefined) { fields.push(`icon = $${idx++}`); values.push(updates.icon); }
    if (updates.color !== undefined) { fields.push(`color = $${idx++}`); values.push(updates.color); }
    if (updates.sortOrder !== undefined) { fields.push(`sort_order = $${idx++}`); values.push(updates.sortOrder); }
    if (updates.isPremium !== undefined) { fields.push(`is_premium = $${idx++}`); values.push(updates.isPremium ? 1 : 0); }
    if (updates.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(updates.isActive ? 1 : 0); }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(categoryId);

    const result = await db.run(`
      UPDATE tool_categories SET ${fields.join(', ')} WHERE id = $${idx}
    `, values);

    return result.changes > 0;
  },

  /**
   * 카테고리 삭제 (소프트 삭제)
   */
  async delete(categoryId) {
    const result = await db.run(`
      UPDATE tool_categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [categoryId]);
    return result.changes > 0;
  }
};

module.exports = ToolCategory;
