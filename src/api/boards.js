/**
 * 다중게시판 API 라우터
 * 게시판 CRUD 및 게시글 관리
 *
 * @version 1.0.0
 * @date 2025-12-21
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const BoardService = require('../services/boardService');
const PostService = require('../services/postService');
const FileService = require('../services/fileService');
const AdminUser = require('../db/models/AdminUser');
const errorLogger = require('../services/errorLogger');

// 프로젝트 루트 경로
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// Multer 설정 (메모리 스토리지)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 기본 10MB (게시판 설정으로 오버라이드 가능)
    files: 5 // 최대 5개 파일
  }
});

/**
 * 로그인 확인 미들웨어
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }
  next();
}

/**
 * 관리자 인증 미들웨어
 * 2026-01-02: AdminUser.isAdmin()이 async이므로 미들웨어도 async로 변경
 */
async function requireAdminAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }

  const userId = req.session.userId;

  // isAdmin은 async 함수이므로 await 필요
  const isAdmin = await AdminUser.isAdmin(userId);
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 없습니다.'
    });
  }

  const isVerified = req.session.adminVerified &&
    AdminUser.isVerificationValid(userId, req.session.adminVerifiedAt, 60);

  if (!isVerified) {
    return res.status(401).json({
      success: false,
      message: '관리자 인증이 필요합니다.',
      requiresVerification: true
    });
  }

  next();
}

// ============================================
// 게시판 관리 API (관리자 전용)
// ============================================

/**
 * GET /api/boards
 * 전체 게시판 목록 조회 (관리자용)
 * 2026-01-02: BoardService.getAllBoards()가 async이므로 핸들러도 async로 변경
 */
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const boards = await BoardService.getAllBoards();

    res.json({
      success: true,
      data: boards
    });
  } catch (error) {
    errorLogger.error('게시판 목록 조회 실패', error, {
      source: 'api.boards.getAll',
      userId: req.session?.userId
    });
    res.status(500).json({
      success: false,
      message: '게시판 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/boards/public
 * 공개 게시판 목록 조회 (모든 사용자)
 * 2026-01-02: BoardService.getPublicBoards()가 async이므로 핸들러도 async로 변경
 */
router.get('/public', async (req, res) => {
  try {
    const boards = await BoardService.getPublicBoards();

    res.json({
      success: true,
      data: boards
    });
  } catch (error) {
    errorLogger.error('공개 게시판 목록 조회 실패', error, {
      source: 'api.boards.getPublic'
    });
    res.status(500).json({
      success: false,
      message: '게시판 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/boards/:boardKey
 * 게시판 상세 조회
 * 2026-01-02: async BoardService 메소드 호출에 await 추가
 */
router.get('/:boardKey', async (req, res) => {
  try {
    const { boardKey } = req.params;
    const board = await BoardService.getBoardByKey(boardKey);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: '게시판을 찾을 수 없습니다.'
      });
    }

    // 읽기 권한 확인
    const userId = req.session?.userId;
    const isAdmin = userId && await AdminUser.isAdmin(userId);

    if (!await BoardService.canRead(boardKey, userId, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: '이 게시판을 볼 권한이 없습니다.'
      });
    }

    // 통계 정보 추가
    const stats = await BoardService.getBoardStats(board.id);

    res.json({
      success: true,
      data: {
        ...board,
        stats
      }
    });
  } catch (error) {
    errorLogger.error('게시판 상세 조회 실패', error, {
      source: 'api.boards.getByKey',
      extra: { boardKey: req.params?.boardKey }
    });
    res.status(500).json({
      success: false,
      message: '게시판 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/boards
 * 게시판 생성 (관리자 전용)
 * 2026-01-02: async BoardService 메소드 호출에 await 추가
 */
router.post('/', requireAdminAuth, async (req, res) => {
  try {
    const boardData = req.body;
    const adminUserId = req.session.userId;

    // 필수 필드 검증
    if (!boardData.board_key || !boardData.name) {
      return res.status(400).json({
        success: false,
        message: '게시판 키와 이름은 필수입니다.'
      });
    }

    // board_key 형식 검증 (영문, 숫자, 하이픈만 허용)
    if (!/^[a-z0-9-]+$/.test(boardData.board_key)) {
      return res.status(400).json({
        success: false,
        message: '게시판 키는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.'
      });
    }

    const result = await BoardService.createBoard(boardData, adminUserId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error('게시판 생성 실패', error, {
      source: 'api.boards.create',
      userId: req.session?.userId,
      extra: { boardData: req.body }
    });
    res.status(500).json({
      success: false,
      message: '게시판 생성 중 오류가 발생했습니다.'
    });
  }
});

/**
 * PUT /api/boards/:boardId
 * 게시판 수정 (관리자 전용)
 * 2026-01-02: async BoardService 메소드 호출에 await 추가
 */
router.put('/:boardId', requireAdminAuth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const boardData = req.body;

    // 게시판 존재 확인
    const board = await BoardService.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: '게시판을 찾을 수 없습니다.'
      });
    }

    const result = await BoardService.updateBoard(boardId, boardData);

    res.json(result);
  } catch (error) {
    errorLogger.error('게시판 수정 실패', error, {
      source: 'api.boards.update',
      userId: req.session?.userId,
      extra: { boardId: req.params?.boardId, boardData: req.body }
    });
    res.status(500).json({
      success: false,
      message: '게시판 수정 중 오류가 발생했습니다.'
    });
  }
});

/**
 * DELETE /api/boards/:boardId
 * 게시판 삭제 (관리자 전용)
 * 2026-01-02: async BoardService 메소드 호출에 await 추가
 */
router.delete('/:boardId', requireAdminAuth, async (req, res) => {
  try {
    const { boardId } = req.params;

    // 게시판 존재 확인
    const board = await BoardService.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: '게시판을 찾을 수 없습니다.'
      });
    }

    const result = await BoardService.deleteBoard(boardId);

    res.json(result);
  } catch (error) {
    errorLogger.error('게시판 삭제 실패', error, {
      source: 'api.boards.delete',
      userId: req.session?.userId,
      extra: { boardId: req.params?.boardId }
    });
    res.status(500).json({
      success: false,
      message: '게시판 삭제 중 오류가 발생했습니다.'
    });
  }
});

/**
 * PATCH /api/boards/:boardId/toggle
 * 게시판 공개/비공개 토글 (관리자 전용)
 * 2026-01-02: async BoardService 메소드 호출에 await 추가
 */
router.patch('/:boardId/toggle', requireAdminAuth, async (req, res) => {
  try {
    const { boardId } = req.params;

    const result = await BoardService.togglePublic(boardId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    errorLogger.error('게시판 공개 토글 실패', error, {
      source: 'api.boards.toggle',
      userId: req.session?.userId,
      extra: { boardId: req.params?.boardId }
    });
    res.status(500).json({
      success: false,
      message: '게시판 상태 변경 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/boards/translate-all
 * 기존 게시판 일괄 번역 (관리자 전용)
 * 번역이 없는 게시판들을 AI로 번역
 */
router.post('/translate-all', requireAdminAuth, async (req, res) => {
  try {
    // 번역 진행 상태 응답을 위해 SSE 대신 동기 처리
    const boards = BoardService.getAllBoards();

    // 번역이 필요한 게시판 필터링 (name_translations이 없거나 불완전한 경우)
    const boardsNeedingTranslation = boards.filter(board => {
      if (!board.name_translations) return true;
      try {
        const translations = JSON.parse(board.name_translations);
        // 5개 언어 모두 있는지 확인
        const requiredLangs = ['ko', 'en', 'ja', 'zh-TW', 'zh-CN'];
        return !requiredLangs.every(lang => translations[lang]);
      } catch {
        return true;
      }
    });

    if (boardsNeedingTranslation.length === 0) {
      return res.json({
        success: true,
        message: '모든 게시판이 이미 번역되어 있습니다.',
        data: { translated: 0, total: boards.length }
      });
    }

    // 번역 실행
    const results = [];
    for (const board of boardsNeedingTranslation) {
      try {
        await BoardService.translateBoardAsync(board.id, board.name, board.description);
        results.push({ id: board.id, name: board.name, success: true });
      } catch (error) {
        results.push({
          id: board.id,
          name: board.name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `${successCount}개 게시판 번역 완료${failCount > 0 ? `, ${failCount}개 실패` : ''}`,
      data: {
        translated: successCount,
        failed: failCount,
        total: boards.length,
        results
      }
    });
  } catch (error) {
    errorLogger.error('게시판 일괄 번역 실패', error, {
      source: 'api.boards.translateAll',
      userId: req.session?.userId
    });
    res.status(500).json({
      success: false,
      message: '게시판 번역 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/boards/translate-selected
 * 선택된 게시판 번역 (관리자 전용)
 * 체크박스로 선택된 게시판들만 AI로 번역
 */
router.post('/translate-selected', requireAdminAuth, async (req, res) => {
  try {
    const { boardIds, force = false } = req.body;

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '번역할 게시판을 선택해주세요.'
      });
    }

    // 번역 실행
    const results = await BoardService.translateSelectedBoardsAsync(boardIds, force);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `${successCount}개 게시판 번역 완료${failCount > 0 ? `, ${failCount}개 실패` : ''}`,
      data: {
        translated: successCount,
        failed: failCount,
        total: boardIds.length,
        results
      }
    });
  } catch (error) {
    errorLogger.error('게시판 선택 번역 실패', error, {
      source: 'api.boards.translateSelected',
      userId: req.session?.userId,
      extra: { boardIds: req.body?.boardIds }
    });
    res.status(500).json({
      success: false,
      message: '게시판 번역 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/boards/translate-content
 * 게시글 내용 실시간 번역 (1회성, DB 저장 안함)
 * 게시글 보기 팝업에서 사용
 */
router.post('/translate-content', requireAuth, async (req, res) => {
  try {
    const { title, content, fileNames, targetLang } = req.body;

    if (!title && !content) {
      return res.status(400).json({
        success: false,
        message: '번역할 내용이 없습니다.'
      });
    }

    if (!targetLang) {
      return res.status(400).json({
        success: false,
        message: '대상 언어를 지정해주세요.'
      });
    }

    // 번역 서비스 호출
    const TranslationService = require('../services/translationService');
    const result = await TranslationService.translateContent(
      title,
      content,
      fileNames || [],
      targetLang
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    errorLogger.error('게시글 내용 번역 실패', error, {
      source: 'api.boards.translateContent',
      userId: req.session?.userId,
      extra: { targetLang: req.body?.targetLang }
    });
    res.status(500).json({
      success: false,
      message: '번역 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/boards/:boardId/stats
 * 게시판 통계 조회 (관리자 전용)
 * 2026-01-02: async BoardService 메소드 호출에 await 추가
 */
router.get('/:boardId/stats', requireAdminAuth, async (req, res) => {
  try {
    const { boardId } = req.params;

    const board = await BoardService.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: '게시판을 찾을 수 없습니다.'
      });
    }

    const stats = await BoardService.getBoardStats(boardId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    errorLogger.error('게시판 통계 조회 실패', error, {
      source: 'api.boards.stats',
      userId: req.session?.userId,
      extra: { boardId: req.params?.boardId }
    });
    res.status(500).json({
      success: false,
      message: '게시판 통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// ============================================
// 게시글 API
// ============================================

/**
 * GET /api/boards/:boardKey/posts
 * 게시글 목록 조회
 * 2026-01-02: async BoardService 메소드 호출에 await 추가
 */
router.get('/:boardKey/posts', async (req, res) => {
  try {
    const { boardKey } = req.params;
    const { page, limit, search, searchType } = req.query;

    // 게시판 조회 및 권한 확인
    const board = await BoardService.getBoardByKey(boardKey);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: '게시판을 찾을 수 없습니다.'
      });
    }

    const userId = req.session?.userId;
    const isAdmin = userId && await AdminUser.isAdmin(userId);

    if (!await BoardService.canRead(boardKey, userId, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: '이 게시판을 볼 권한이 없습니다.'
      });
    }

    const result = await PostService.getPostsByBoardKey(boardKey, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      searchType
    });

    res.json({
      success: true,
      data: result.posts,
      pagination: result.pagination
    });
  } catch (error) {
    errorLogger.error('게시글 목록 조회 실패', error, {
      source: 'api.boards.posts.list',
      extra: { boardKey: req.params?.boardKey }
    });
    res.status(500).json({
      success: false,
      message: '게시글 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/boards/:boardKey/posts/:postId
 * 게시글 상세 조회
 * 2026-01-02: async BoardService 메소드 호출에 await 추가
 */
router.get('/:boardKey/posts/:postId', async (req, res) => {
  try {
    const { boardKey, postId } = req.params;

    // 게시판 권한 확인
    const userId = req.session?.userId;
    const isAdmin = userId && await AdminUser.isAdmin(userId);

    if (!await BoardService.canRead(boardKey, userId, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: '이 게시판을 볼 권한이 없습니다.'
      });
    }

    const post = await PostService.getPostDetail(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    errorLogger.error('게시글 상세 조회 실패', error, {
      source: 'api.boards.posts.detail',
      extra: { boardKey: req.params?.boardKey, postId: req.params?.postId }
    });
    res.status(500).json({
      success: false,
      message: '게시글 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/boards/:boardKey/posts
 * 게시글 작성
 * 2026-01-02: async BoardService 메소드 호출에 await 추가
 */
router.post('/:boardKey/posts', requireAuth, async (req, res) => {
  try {
    const { boardKey } = req.params;
    const postData = req.body;

    // 게시판 조회
    const board = await BoardService.getBoardByKey(boardKey);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: '게시판을 찾을 수 없습니다.'
      });
    }

    // 글쓰기 권한 확인
    const userId = req.session.userId;
    const isAdmin = await AdminUser.isAdmin(userId);

    if (!await BoardService.canWrite(boardKey, userId, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: '글쓰기 권한이 없습니다.'
      });
    }

    // 필수 필드 검증
    if (!postData.title || !postData.content) {
      return res.status(400).json({
        success: false,
        message: '제목과 내용은 필수입니다.'
      });
    }

    // 공지/상단 고정은 관리자만
    if ((postData.is_notice || postData.is_pinned) && !isAdmin) {
      postData.is_notice = false;
      postData.is_pinned = false;
    }

    const authorInfo = {
      userId: userId,
      userName: req.session.userName || null,
      userEmail: req.session.userEmail || null
    };

    const result = await PostService.createPost(board.id, postData, authorInfo);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    errorLogger.error('게시글 작성 실패', error, {
      source: 'api.boards.posts.create',
      userId: req.session?.userId,
      extra: { boardKey: req.params?.boardKey }
    });
    res.status(500).json({
      success: false,
      message: '게시글 작성 중 오류가 발생했습니다.'
    });
  }
});

/**
 * PUT /api/boards/:boardKey/posts/:postId
 * 게시글 수정
 * 2026-01-02: async AdminUser.isAdmin() 호출에 await 추가
 */
router.put('/:boardKey/posts/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const postData = req.body;
    const userId = req.session.userId;
    const isAdmin = await AdminUser.isAdmin(userId);

    const result = await PostService.updatePost(postId, postData, userId, isAdmin);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error === '수정 권한이 없습니다.' ? 403 : 404).json(result);
    }
  } catch (error) {
    errorLogger.error('게시글 수정 실패', error, {
      source: 'api.boards.posts.update',
      userId: req.session?.userId,
      extra: { postId: req.params?.postId }
    });
    res.status(500).json({
      success: false,
      message: '게시글 수정 중 오류가 발생했습니다.'
    });
  }
});

/**
 * DELETE /api/boards/:boardKey/posts/:postId
 * 게시글 삭제
 * 2026-01-02: async AdminUser.isAdmin() 호출에 await 추가
 */
router.delete('/:boardKey/posts/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.userId;
    const isAdmin = await AdminUser.isAdmin(userId);

    const result = await PostService.deletePost(postId, userId, isAdmin);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error === '삭제 권한이 없습니다.' ? 403 : 404).json(result);
    }
  } catch (error) {
    errorLogger.error('게시글 삭제 실패', error, {
      source: 'api.boards.posts.delete',
      userId: req.session?.userId,
      extra: { postId: req.params?.postId }
    });
    res.status(500).json({
      success: false,
      message: '게시글 삭제 중 오류가 발생했습니다.'
    });
  }
});

/**
 * PATCH /api/boards/:boardKey/posts/:postId/pin
 * 게시글 상단 고정 토글 (관리자)
 */
router.patch('/:boardKey/posts/:postId/pin', requireAdminAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await PostService.togglePinned(postId);
    res.json(result);
  } catch (error) {
    errorLogger.error('게시글 상단 고정 토글 실패', error, {
      source: 'api.boards.posts.pin',
      extra: { postId: req.params?.postId }
    });
    res.status(500).json({
      success: false,
      message: '상태 변경 중 오류가 발생했습니다.'
    });
  }
});

/**
 * PATCH /api/boards/:boardKey/posts/:postId/notice
 * 게시글 공지 토글 (관리자)
 */
router.patch('/:boardKey/posts/:postId/notice', requireAdminAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await PostService.toggleNotice(postId);
    res.json(result);
  } catch (error) {
    errorLogger.error('게시글 공지 토글 실패', error, {
      source: 'api.boards.posts.notice',
      extra: { postId: req.params?.postId }
    });
    res.status(500).json({
      success: false,
      message: '상태 변경 중 오류가 발생했습니다.'
    });
  }
});

// ============================================
// 파일 첨부 API
// ============================================

/**
 * POST /api/boards/:boardKey/posts/:postId/files
 * 게시글에 파일 업로드
 * 2026-01-02: async BoardService/AdminUser 메소드 호출에 await 추가
 */
router.post('/:boardKey/posts/:postId/files', requireAuth, upload.array('files', 5), async (req, res) => {
  try {
    const { boardKey, postId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '업로드할 파일이 없습니다.'
      });
    }

    // 게시판 조회
    const board = await BoardService.getBoardByKey(boardKey);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: '게시판을 찾을 수 없습니다.'
      });
    }

    // 파일 업로드 허용 여부 확인
    if (!board.allow_file_upload) {
      return res.status(403).json({
        success: false,
        message: '이 게시판은 파일 첨부를 허용하지 않습니다.'
      });
    }

    // 게시글 존재 및 권한 확인
    const post = await PostService.getPostById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.'
      });
    }

    const userId = req.session.userId;
    const isAdmin = await AdminUser.isAdmin(userId);

    // 작성자 또는 관리자만 파일 추가 가능
    if (post.author_id !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '파일 추가 권한이 없습니다.'
      });
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      // 파일 저장
      const saveResult = FileService.saveFile(file, boardKey, postId, board);

      if (saveResult.success) {
        // DB 레코드 생성
        const recordResult = FileService.createFileRecord(postId, saveResult.data);
        if (recordResult.success) {
          uploadedFiles.push({
            id: recordResult.data.id,
            original_name: saveResult.data.originalName,
            file_size: saveResult.data.fileSize,
            mime_type: saveResult.data.mimeType
          });
        }
      } else {
        errors.push({
          filename: file.originalname,
          error: saveResult.error
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        uploaded: uploadedFiles,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    errorLogger.error('파일 업로드 실패', error, {
      source: 'api.boards.files.upload',
      userId: req.session?.userId,
      extra: { boardKey: req.params?.boardKey, postId: req.params?.postId }
    });
    res.status(500).json({
      success: false,
      message: '파일 업로드 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/boards/files/:fileId
 * 파일 다운로드
 * 2026-01-02: async BoardService/AdminUser 메소드 호출에 await 추가
 */
router.get('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    // 파일 정보 조회
    const file = FileService.getFileById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '파일을 찾을 수 없습니다.'
      });
    }

    // 읽기 권한 확인
    const userId = req.session?.userId;
    const isAdmin = userId && await AdminUser.isAdmin(userId);

    if (!await BoardService.canRead(file.board_key, userId, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: '파일 다운로드 권한이 없습니다.'
      });
    }

    // 실제 파일 경로
    const fullPath = path.join(PROJECT_ROOT, file.file_path);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: '파일이 존재하지 않습니다.'
      });
    }

    // 다운로드 카운트 증가
    FileService.incrementDownloadCount(fileId);

    // 파일 다운로드 응답
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', file.file_size);

    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    errorLogger.error('파일 다운로드 실패', error, {
      source: 'api.boards.files.download',
      extra: { fileId: req.params?.fileId }
    });
    res.status(500).json({
      success: false,
      message: '파일 다운로드 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/boards/files/:fileId/info
 * 파일 정보 조회
 */
router.get('/files/:fileId/info', (req, res) => {
  try {
    const { fileId } = req.params;

    const file = FileService.getFileById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '파일을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        id: file.id,
        original_name: file.original_name,
        file_size: file.file_size,
        mime_type: file.mime_type,
        download_count: file.download_count,
        uploaded_at: file.uploaded_at,
        icon: FileService.getFileIcon(file.mime_type),
        size_formatted: FileService.formatFileSize(file.file_size)
      }
    });
  } catch (error) {
    errorLogger.error('파일 정보 조회 실패', error, {
      source: 'api.boards.files.info',
      extra: { fileId: req.params?.fileId }
    });
    res.status(500).json({
      success: false,
      message: '파일 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * DELETE /api/boards/files/:fileId
 * 파일 삭제
 * 2026-01-02: async AdminUser.isAdmin() 호출에 await 추가
 */
router.delete('/files/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.session.userId;
    const isAdmin = await AdminUser.isAdmin(userId);

    const result = FileService.deleteFile(fileId, userId, isAdmin);

    if (result.success) {
      res.json(result);
    } else {
      const statusCode = result.error === '삭제 권한이 없습니다.' ? 403 : 404;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    errorLogger.error('파일 삭제 실패', error, {
      source: 'api.boards.files.delete',
      userId: req.session?.userId,
      extra: { fileId: req.params?.fileId }
    });
    res.status(500).json({
      success: false,
      message: '파일 삭제 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/boards/:boardKey/posts/:postId/files
 * 게시글의 첨부파일 목록 조회
 * 2026-01-02: async BoardService/AdminUser 메소드 호출에 await 추가
 */
router.get('/:boardKey/posts/:postId/files', async (req, res) => {
  try {
    const { boardKey, postId } = req.params;

    // 읽기 권한 확인
    const userId = req.session?.userId;
    const isAdmin = userId && await AdminUser.isAdmin(userId);

    if (!await BoardService.canRead(boardKey, userId, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.'
      });
    }

    const files = FileService.getFilesByPostId(postId);

    // 파일 정보에 아이콘과 포맷된 크기 추가
    const filesWithMeta = files.map(file => ({
      ...file,
      icon: FileService.getFileIcon(file.mime_type),
      size_formatted: FileService.formatFileSize(file.file_size)
    }));

    res.json({
      success: true,
      data: filesWithMeta
    });
  } catch (error) {
    errorLogger.error('첨부파일 목록 조회 실패', error, {
      source: 'api.boards.files.list',
      extra: { boardKey: req.params?.boardKey, postId: req.params?.postId }
    });
    res.status(500).json({
      success: false,
      message: '첨부파일 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
