/**
 * 게시글 서비스
 * 게시글 CRUD 및 관련 기능
 *
 * @version 1.0.0
 * @date 2025-12-21
 * @updated 2025-12-31 - PostgreSQL 모드 지원 추가
 * @updated 2026-02-18 - db/index.js 공통 API로 전환 (C1 DummyDB 수정)
 */

const errorLogger = require('./errorLogger');

// db/index.js 공통 API 사용 (PostgreSQL)
const db = require('../db');

class PostService {
  /**
   * 게시글 생성
   */
  static async createPost(boardId, postData, authorInfo) {
    try {
      const result = await db.run(`
        INSERT INTO board_posts (
          board_id, title, content, author_id, author_name, author_email,
          is_pinned, is_notice, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `, [
        boardId,
        postData.title,
        postData.content,
        authorInfo.userId,
        authorInfo.userName || null,
        authorInfo.userEmail || null,
        postData.is_pinned ? 1 : 0,
        postData.is_notice ? 1 : 0
      ]);

      const postId = result.lastInsertRowid || result.id;

      return {
        success: true,
        data: {
          id: postId,
          board_id: boardId,
          title: postData.title
        }
      };
    } catch (error) {
      errorLogger.error('게시글 생성 실패', error, {
        source: 'PostService.createPost',
        extra: { boardId, title: postData.title }
      });
      throw error;
    }
  }

  /**
   * 게시글 수정
   */
  static async updatePost(postId, postData, userId, isAdmin) {
    try {
      const post = await this.getPostById(postId);
      if (!post) {
        return { success: false, error: '게시글을 찾을 수 없습니다.' };
      }

      if (post.author_id !== userId && !isAdmin) {
        return { success: false, error: '수정 권한이 없습니다.' };
      }

      const result = await db.run(`
        UPDATE board_posts SET
          title = COALESCE(?, title),
          content = COALESCE(?, content),
          is_pinned = COALESCE(?, is_pinned),
          is_notice = COALESCE(?, is_notice),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        postData.title || null,
        postData.content || null,
        postData.is_pinned !== undefined ? (postData.is_pinned ? 1 : 0) : null,
        postData.is_notice !== undefined ? (postData.is_notice ? 1 : 0) : null,
        postId
      ]);

      return {
        success: result.changes > 0,
        data: { id: postId }
      };
    } catch (error) {
      errorLogger.error('게시글 수정 실패', error, {
        source: 'PostService.updatePost',
        extra: { postId, postData }
      });
      throw error;
    }
  }

  /**
   * 게시글 삭제 (소프트 삭제)
   */
  static async deletePost(postId, userId, isAdmin) {
    try {
      const post = await this.getPostById(postId);
      if (!post) {
        return { success: false, error: '게시글을 찾을 수 없습니다.' };
      }

      if (post.author_id !== userId && !isAdmin) {
        return { success: false, error: '삭제 권한이 없습니다.' };
      }

      const result = await db.run(`
        UPDATE board_posts SET
          status = 'deleted',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [postId]);

      return { success: result.changes > 0 };
    } catch (error) {
      errorLogger.error('게시글 삭제 실패', error, {
        source: 'PostService.deletePost',
        extra: { postId }
      });
      throw error;
    }
  }

  /**
   * 게시글 ID로 조회
   */
  static async getPostById(postId) {
    return db.get(`
      SELECT p.*,
        (SELECT COUNT(*) FROM board_files WHERE post_id = p.id) as file_count,
        (SELECT COUNT(*) FROM board_comments WHERE post_id = p.id AND status = 'active') as comment_count
      FROM board_posts p
      WHERE p.id = ? AND p.status != 'deleted'
    `, [postId]);
  }

  /**
   * 게시글 상세 조회 (조회수 증가)
   */
  static async getPostDetail(postId) {
    // 조회수 증가
    await db.run(`
      UPDATE board_posts SET view_count = view_count + 1 WHERE id = ?
    `, [postId]);

    // 게시글 조회
    const post = await this.getPostById(postId);

    if (post) {
      // 첨부파일 목록 조회
      post.files = await db.all(`
        SELECT id, original_name, file_size, mime_type, download_count
        FROM board_files WHERE post_id = ?
      `, [postId]);
    }

    return post;
  }

  /**
   * 게시판별 게시글 목록 조회
   */
  static async getPostsByBoardId(boardId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const search = options.search || null;
    const searchType = options.searchType || 'title';

    let whereClause = 'WHERE p.board_id = ? AND p.status = ?';
    const params = [boardId, 'active'];

    // 검색 조건
    if (search) {
      switch (searchType) {
        case 'title':
          whereClause += ' AND p.title LIKE ?';
          params.push(`%${search}%`);
          break;
        case 'content':
          whereClause += ' AND p.content LIKE ?';
          params.push(`%${search}%`);
          break;
        case 'author':
          whereClause += ' AND p.author_name LIKE ?';
          params.push(`%${search}%`);
          break;
        case 'all':
          whereClause += ' AND (p.title LIKE ? OR p.content LIKE ? OR p.author_name LIKE ?)';
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
          break;
      }
    }

    // 총 개수 조회
    const countRow = await db.get(`
      SELECT COUNT(*) as total FROM board_posts p ${whereClause}
    `, params);
    const total = parseInt(countRow?.total || 0);

    // 게시글 목록 조회 (공지/상단 고정 우선)
    const posts = await db.all(`
      SELECT p.id, p.title, p.author_name, p.view_count,
             p.is_pinned, p.is_notice, p.created_at, p.updated_at,
             (SELECT COUNT(*) FROM board_files WHERE post_id = p.id) as has_files,
             (SELECT COUNT(*) FROM board_comments WHERE post_id = p.id AND status = 'active') as comment_count
      FROM board_posts p
      ${whereClause}
      ORDER BY p.is_notice DESC, p.is_pinned DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 게시판 키로 게시글 목록 조회
   */
  static async getPostsByBoardKey(boardKey, options = {}) {
    const board = await db.get('SELECT id FROM boards WHERE board_key = ?', [boardKey]);

    if (!board) {
      return { posts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    return this.getPostsByBoardId(board.id, options);
  }

  /**
   * 상단 고정 토글
   */
  static async togglePinned(postId) {
    try {
      const result = await db.run(`
        UPDATE board_posts SET
          is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [postId]);

      if (result.changes > 0) {
        const post = await this.getPostById(postId);
        return {
          success: true,
          data: { id: postId, is_pinned: post.is_pinned }
        };
      }

      return { success: false, error: '게시글을 찾을 수 없습니다.' };
    } catch (error) {
      errorLogger.error('게시글 상단 고정 토글 실패', error, {
        source: 'PostService.togglePinned',
        extra: { postId }
      });
      throw error;
    }
  }

  /**
   * 공지 토글
   */
  static async toggleNotice(postId) {
    try {
      const result = await db.run(`
        UPDATE board_posts SET
          is_notice = CASE WHEN is_notice = 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [postId]);

      if (result.changes > 0) {
        const post = await this.getPostById(postId);
        return {
          success: true,
          data: { id: postId, is_notice: post.is_notice }
        };
      }

      return { success: false, error: '게시글을 찾을 수 없습니다.' };
    } catch (error) {
      errorLogger.error('게시글 공지 토글 실패', error, {
        source: 'PostService.toggleNotice',
        extra: { postId }
      });
      throw error;
    }
  }

  /**
   * 사용자의 게시글 목록 조회
   */
  static async getPostsByAuthor(authorId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const countRow = await db.get(`
      SELECT COUNT(*) as total FROM board_posts
      WHERE author_id = ? AND status = 'active'
    `, [authorId]);
    const total = parseInt(countRow?.total || 0);

    const posts = await db.all(`
      SELECT p.id, p.title, p.view_count, p.created_at,
             b.name as board_name, b.board_key
      FROM board_posts p
      JOIN boards b ON p.board_id = b.id
      WHERE p.author_id = ? AND p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [authorId, limit, offset]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = PostService;
