/**
 * 도구 API 라우터
 * All-in-One 도구 허브의 도구/카테고리 관리
 *
 * @module api/tools
 * @created 2026-01-11
 */

const express = require('express');
const router = express.Router();
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 모델
const ToolCategory = require('../db/models/ToolCategory');
const Tool = require('../db/models/Tool');

// YouTube 도구용 임시 디렉토리
const TEMP_DIR = path.join(os.tmpdir(), 'mymind3-youtube');

// Python Scripts 경로를 PATH에 추가 (yt-dlp, whisper 등 pip 설치 도구)
const PYTHON_SCRIPTS_PATHS = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'Python', 'Python314', 'Scripts'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'Python', 'Python313', 'Scripts'),
  path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python314', 'Scripts'),
  path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python313', 'Scripts'),
  'C:\\Python314\\Scripts',
  'C:\\Python313\\Scripts'
].filter(p => fs.existsSync(p));

const EXEC_ENV = {
  ...process.env,
  PATH: [...PYTHON_SCRIPTS_PATHS, process.env.PATH].join(path.delimiter)
};

// db/index.js 공통 API 사용 (PostgreSQL)
const dbCommon = require('../db');

/**
 * GET /api/tools
 * 모든 도구를 카테고리별로 그룹화하여 반환
 */
router.get('/', async (req, res) => {
  try {
    let categories;
    let toolsGrouped;

    categories = await ToolCategory.getAll();
    toolsGrouped = await Tool.getAllGroupedByCategory();

    // 카테고리 정보와 도구 병합
    const result = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      isPremium: !!cat.isPremium,
      sortOrder: cat.sortOrder,
      tools: toolsGrouped[cat.id]?.tools || []
    }));

    // 총 도구 개수 계산
    const totalCount = result.reduce((sum, cat) => sum + cat.tools.length, 0);

    res.json({
      success: true,
      data: {
        categories: result,
        totalCount,
        categoryCount: result.length
      }
    });
  } catch (error) {
    console.error('[Tools API] Error fetching tools:', error);
    res.status(500).json({
      success: false,
      error: '도구 목록을 불러오는데 실패했습니다.'
    });
  }
});

/**
 * GET /api/tools/categories
 * 카테고리 목록만 반환
 */
router.get('/categories', async (req, res) => {
  try {
    let categories;

    categories = await ToolCategory.getAll();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('[Tools API] Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: '카테고리 목록을 불러오는데 실패했습니다.'
    });
  }
});

/**
 * GET /api/tools/category/:categoryId
 * 특정 카테고리의 도구 목록
 */
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    let category;
    let tools;

    category = await ToolCategory.getById(categoryId);
    tools = await Tool.getByCategory(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: '카테고리를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        category,
        tools
      }
    });
  } catch (error) {
    console.error('[Tools API] Error fetching category tools:', error);
    res.status(500).json({
      success: false,
      error: '카테고리 도구를 불러오는데 실패했습니다.'
    });
  }
});

/**
 * GET /api/tools/search
 * 도구 검색
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    let results;

    results = await Tool.search(q);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[Tools API] Error searching tools:', error);
    res.status(500).json({
      success: false,
      error: '도구 검색에 실패했습니다.'
    });
  }
});

/**
 * GET /api/tools/:toolId/qa
 * 특정 도구의 Q&A 목록 조회
 */
router.get('/:toolId/qa', async (req, res) => {
  try {
    const { toolId } = req.params;

    // 답변 완료된 Q&A만 조회 (is_public=1이고 status='answered')
    // 최신순 정렬
    const qaList = await dbCommon.all(`
      SELECT qa.*, u.display_name as user_name
      FROM tool_qa qa
      LEFT JOIN users u ON qa.user_id = u.id
      WHERE qa.tool_id = ?
        AND qa.status = 'answered'
        AND qa.is_public = true
      ORDER BY qa.created_at DESC
    `, [toolId]);

    res.json({
      success: true,
      data: qaList
    });
  } catch (error) {
    console.error('[Tools API] Error fetching Q&A:', error);
    res.status(500).json({
      success: false,
      error: 'Q&A 목록을 불러오는데 실패했습니다.'
    });
  }
});

/**
 * POST /api/tools/:toolId/qa
 * 새 질문 등록
 */
router.post('/:toolId/qa', async (req, res) => {
  try {
    const { toolId } = req.params;
    const { question, email } = req.body;
    const userId = req.user?.id || null;

    if (!question || question.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: '질문은 최소 5자 이상 입력해주세요.'
      });
    }

    if (question.length > 1000) {
      return res.status(400).json({
        success: false,
        error: '질문은 1000자를 초과할 수 없습니다.'
      });
    }

    // 이메일 필수 검증
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: '이메일은 필수 입력 항목입니다.'
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 형식을 입력해주세요.'
      });
    }

    // 도구 존재 확인
    const tool = await Tool.getById(toolId);

    if (!tool) {
      return res.status(404).json({
        success: false,
        error: '도구를 찾을 수 없습니다.'
      });
    }

    const result = await dbCommon.run(`
      INSERT INTO tool_qa (tool_id, user_id, question, email, status, is_public)
      VALUES (?, ?, ?, ?, 'pending', 0)
    `, [toolId, userId, question.trim(), email?.trim() || null]);

    const newQa = await dbCommon.get('SELECT * FROM tool_qa WHERE id = ?', [result.lastInsertRowid || result.id]);

    res.status(201).json({
      success: true,
      message: '질문이 등록되었습니다. 답변이 등록되면 알려드리겠습니다.',
      data: newQa
    });
  } catch (error) {
    console.error('[Tools API] Error creating Q&A:', error);
    res.status(500).json({
      success: false,
      error: '질문 등록에 실패했습니다.'
    });
  }
});

/**
 * GET /api/tools/:toolId
 * 특정 도구 정보
 */
router.get('/:toolId', async (req, res) => {
  try {
    const { toolId } = req.params;

    let tool;

    tool = await Tool.getById(toolId);

    if (!tool) {
      return res.status(404).json({
        success: false,
        error: '도구를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: tool
    });
  } catch (error) {
    console.error('[Tools API] Error fetching tool:', error);
    res.status(500).json({
      success: false,
      error: '도구 정보를 불러오는데 실패했습니다.'
    });
  }
});

// ================================================
// YouTube 텍스트 추출 API
// ================================================

/**
 * 임시 디렉토리 생성
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  return TEMP_DIR;
}

/**
 * 임시 파일 정리
 */
function cleanupTempFiles(videoId) {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    files.forEach(file => {
      if (file.startsWith(videoId)) {
        fs.unlinkSync(path.join(TEMP_DIR, file));
      }
    });
  } catch (err) {
    console.warn('[YouTube API] 임시 파일 정리 실패:', err.message);
  }
}

/**
 * GET /api/tools/youtube/info
 * YouTube 영상 정보 조회
 */
router.get('/youtube/info', async (req, res) => {
  try {
    const { videoId } = req.query;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'videoId가 필요합니다.'
      });
    }

    // Video ID 검증 (11자 영숫자)
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return res.status(400).json({
        success: false,
        error: '잘못된 Video ID 형식입니다.'
      });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // yt-dlp로 영상 정보 조회
    const { stdout } = await execAsync(
      `yt-dlp --dump-json -q "${url}"`,
      { maxBuffer: 10 * 1024 * 1024, env: EXEC_ENV }
    );

    const info = JSON.parse(stdout);

    res.json({
      success: true,
      data: {
        title: info.title || '제목 없음',
        channel: info.uploader || info.channel || '',
        duration: info.duration || 0,
        thumbnail: info.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        description: info.description?.substring(0, 500) || '',
        hasSubtitles: !!(info.subtitles && Object.keys(info.subtitles).length > 0),
        hasAutoCaptions: !!(info.automatic_captions && Object.keys(info.automatic_captions).length > 0)
      }
    });

  } catch (error) {
    console.error('[YouTube API] Info error:', error.message);
    res.status(500).json({
      success: false,
      error: '영상 정보를 가져올 수 없습니다.'
    });
  }
});

/**
 * POST /api/tools/youtube/extract
 * YouTube 텍스트 추출 (자막 또는 Whisper)
 */
router.post('/youtube/extract', async (req, res) => {
  const { videoId, method = 'auto', language = 'auto', includeTimestamp = false } = req.body;

  if (!videoId) {
    return res.status(400).json({
      success: false,
      error: 'videoId가 필요합니다.'
    });
  }

  // Video ID 검증
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({
      success: false,
      error: '잘못된 Video ID 형식입니다.'
    });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  ensureTempDir();

  try {
    let text = '';
    let timestamps = [];
    let duration = 0;

    // 1. 먼저 영상 정보 조회
    console.log('[YouTube API] 영상 정보 조회 중...');
    const { stdout: infoJson } = await execAsync(
      `yt-dlp --dump-json -q "${url}"`,
      { maxBuffer: 10 * 1024 * 1024, env: EXEC_ENV }
    );
    const videoInfo = JSON.parse(infoJson);
    duration = videoInfo.duration || 0;

    // 자막 언어 설정
    let subtitleLangs = 'ko,ko-KR,en,en-US';
    if (language === 'ko') subtitleLangs = 'ko,ko-KR';
    else if (language === 'en') subtitleLangs = 'en,en-US';

    // 2. 자막 방식 (method가 subtitle 또는 auto)
    if (method === 'subtitle' || method === 'auto') {
      console.log('[YouTube API] 자막 추출 시도 중...');

      const subtitlePath = path.join(TEMP_DIR, videoId);

      // 자막 다운로드 (수동 자막 우선, 없으면 자동 생성 자막)
      // yt-dlp는 일부 자막만 성공해도 exit code 1을 반환할 수 있으므로,
      // 에러 발생해도 다운로드된 파일이 있는지 확인
      try {
        await execAsync(
          `yt-dlp --skip-download --write-sub --write-auto-sub --sub-lang "${subtitleLangs}" -o "${subtitlePath}" "${url}"`,
          { maxBuffer: 10 * 1024 * 1024, cwd: TEMP_DIR, env: EXEC_ENV }
        );
      } catch (subError) {
        console.log('[YouTube API] yt-dlp 자막 명령 경고 (일부 성공 가능):', subError.message?.substring(0, 200));
      }

      // 다운로드된 자막 파일 찾기 (SRT 또는 VTT) - 에러 여부와 무관하게 확인
      try {
        const files = fs.readdirSync(TEMP_DIR);
        const subtitleFile = files.find(f =>
          f.startsWith(videoId) && (f.endsWith('.srt') || f.endsWith('.vtt'))
        );

        if (subtitleFile) {
          const subtitleContent = fs.readFileSync(path.join(TEMP_DIR, subtitleFile), 'utf-8');
          const isVTT = subtitleFile.endsWith('.vtt');
          const parsed = isVTT ? parseVTT(subtitleContent) : parseSRT(subtitleContent);
          text = parsed.text;
          timestamps = includeTimestamp ? parsed.timestamps : [];
          console.log(`[YouTube API] 자막 추출 성공 (${isVTT ? 'VTT' : 'SRT'}, ${text.length}자)`);
        } else {
          console.log('[YouTube API] 자막 파일을 찾을 수 없음');
        }
      } catch (readError) {
        console.log('[YouTube API] 자막 파일 읽기 실패:', readError.message);
      }
    }

    // 3. Whisper 방식 (자막 없거나 method가 whisper)
    if (!text && (method === 'whisper' || method === 'auto')) {
      console.log('[YouTube API] Whisper 추출 시도 중...');

      // Whisper 설치 확인
      try {
        await execAsync('whisper --help', { env: EXEC_ENV });
      } catch {
        cleanupTempFiles(videoId);
        return res.status(400).json({
          success: false,
          error: 'Whisper AI가 설치되어 있지 않습니다. 서버에 "pip install openai-whisper"를 실행하여 설치가 필요합니다.'
        });
      }

      // 오디오 다운로드
      const audioPath = path.join(TEMP_DIR, `${videoId}.mp3`);
      console.log('[YouTube API] 오디오 다운로드 중...');

      await execAsync(
        `yt-dlp -x --audio-format mp3 --audio-quality 4 -o "${path.join(TEMP_DIR, videoId)}.%(ext)s" "${url}"`,
        { maxBuffer: 10 * 1024 * 1024, env: EXEC_ENV }
      );

      // Whisper로 변환
      console.log('[YouTube API] Whisper 변환 중...');
      const whisperLang = language === 'auto' ? '' : `--language ${language}`;
      const whisperOutput = path.join(TEMP_DIR, videoId);

      await execAsync(
        `whisper "${audioPath}" --model base ${whisperLang} --output_format srt --output_dir "${TEMP_DIR}"`,
        { maxBuffer: 50 * 1024 * 1024, env: EXEC_ENV }
      );

      // Whisper 결과 파일 읽기
      const whisperSrt = path.join(TEMP_DIR, `${videoId}.srt`);
      if (fs.existsSync(whisperSrt)) {
        const srtContent = fs.readFileSync(whisperSrt, 'utf-8');
        const parsed = parseSRT(srtContent);
        text = parsed.text;
        timestamps = includeTimestamp ? parsed.timestamps : [];
        console.log('[YouTube API] Whisper 변환 성공');
      }
    }

    // 결과 없음
    if (!text) {
      cleanupTempFiles(videoId);
      return res.status(400).json({
        success: false,
        error: '자막을 찾을 수 없고, Whisper 변환에도 실패했습니다. 자막이 있는 영상을 선택하거나 Whisper를 설치해주세요.'
      });
    }

    // 임시 파일 정리
    cleanupTempFiles(videoId);

    res.json({
      success: true,
      data: {
        text,
        timestamps,
        duration,
        method: timestamps.length > 0 ? 'subtitle' : 'whisper'
      }
    });

  } catch (error) {
    console.error('[YouTube API] Extract error:', error);
    cleanupTempFiles(videoId);
    res.status(500).json({
      success: false,
      error: error.message || '텍스트 추출에 실패했습니다.'
    });
  }
});

/**
 * VTT 파일 파싱 (YouTube 자동 자막 최적화)
 * YouTube VTT 구조: 각 블록에 두 줄 - 첫째 줄은 이전 텍스트, 둘째 줄은 새 텍스트(인라인 태그 포함)
 */
function parseVTT(vttContent) {
  const lines = vttContent.split('\n');
  const timestamps = [];
  let currentTimestamp = null;
  let allText = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // WEBVTT 헤더 및 메타데이터 건너뛰기
    if (line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:') || line === '') {
      continue;
    }

    // 타임코드 라인 (00:00:09.825 --> 00:00:12.070)
    if (line.includes('-->')) {
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
      if (timeMatch) {
        currentTimestamp = {
          start: srtTimeToSeconds(timeMatch[1]),
          end: srtTimeToSeconds(timeMatch[2])
        };
      }
    }
    // 인라인 타임스탬프 태그가 있는 줄만 새 텍스트로 처리 (YouTube 자동 자막 특징)
    else if (line && /<\d{2}:\d{2}:\d{2}[.,]\d{3}>/.test(line)) {
      let cleanText = line
        .replace(/<\d{2}:\d{2}:\d{2}[.,]\d{3}>/g, '') // 타임스탬프 태그
        .replace(/<\/?c>/g, '')  // <c> 태그
        .replace(/<[^>]*>/g, '') // 기타 HTML 태그
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

      if (cleanText && currentTimestamp) {
        timestamps.push({ ...currentTimestamp, text: cleanText });
        allText.push(cleanText);
      }
    }
    // 인라인 태그 없는 단독 텍스트 (예: [음악], 단순 자막)
    else if (line && !/^\d+$/.test(line) && !line.includes('-->')) {
      // 이전 텍스트와 중복이 아닌 경우만 (예: [음악])
      const cleanText = line
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();

      // [음악], [박수] 같은 특수 표시이거나 이전 텍스트와 다른 경우
      if (cleanText && (cleanText.startsWith('[') || (allText.length === 0 || !allText[allText.length - 1].includes(cleanText)))) {
        if (currentTimestamp && !allText.includes(cleanText)) {
          timestamps.push({ ...currentTimestamp, text: cleanText });
          allText.push(cleanText);
        }
      }
    }
  }

  return {
    text: allText.join(' '),
    timestamps
  };
}

/**
 * SRT 파일 파싱
 */
function parseSRT(srtContent) {
  const lines = srtContent.split('\n');
  const timestamps = [];
  let currentTimestamp = null;
  let currentText = [];
  let allText = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 타임코드 라인 (00:00:00,000 --> 00:00:00,000)
    if (line.includes('-->')) {
      if (currentTimestamp && currentText.length > 0) {
        const text = currentText.join(' ').trim();
        if (text) {
          timestamps.push({ ...currentTimestamp, text });
          allText.push(text);
        }
      }

      const [start, end] = line.split('-->').map(t => t.trim());
      currentTimestamp = {
        start: srtTimeToSeconds(start),
        end: srtTimeToSeconds(end)
      };
      currentText = [];
    }
    // 텍스트 라인 (숫자만 있는 라인 제외)
    else if (line && !/^\d+$/.test(line)) {
      // HTML 태그 및 특수 문자 제거
      const cleanText = line
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      if (cleanText) {
        currentText.push(cleanText);
      }
    }
  }

  // 마지막 항목 처리
  if (currentTimestamp && currentText.length > 0) {
    const text = currentText.join(' ').trim();
    if (text) {
      timestamps.push({ ...currentTimestamp, text });
      allText.push(text);
    }
  }

  return {
    text: allText.join(' '),
    timestamps
  };
}

/**
 * SRT 시간 형식을 초로 변환
 */
function srtTimeToSeconds(timeStr) {
  // 00:00:00,000 또는 00:00:00.000 형식
  const [time, ms] = timeStr.replace(',', '.').split('.');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + (parseInt(ms || 0, 10) / 1000);
}

// ==========================================
// 관리자용 API 엔드포인트
// ==========================================

/**
 * GET /api/tools/admin/list
 * 관리자용 도구 목록 조회 (필터링 지원)
 */
router.get('/admin/list', async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const { category, status, search } = req.query;

    const tools = await Tool.getAllForAdmin({ category, status, search });

    res.json({
      success: true,
      tools: tools || []
    });
  } catch (error) {
    console.error('[Tools Admin] 도구 목록 조회 실패:', error);
    res.status(500).json({ success: false, message: '도구 목록 조회에 실패했습니다.' });
  }
});

/**
 * PUT /api/tools/admin/:id/status
 * 도구 상태 변경 (활성화/비활성화)
 */
router.put('/admin/:id/status', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const { id } = req.params;
    const { is_active } = req.body;

    await Tool.updateStatus(id, is_active);

    res.json({ success: true, message: '상태가 변경되었습니다.' });
  } catch (error) {
    console.error('[Tools Admin] 상태 변경 실패:', error);
    res.status(500).json({ success: false, message: '상태 변경에 실패했습니다.' });
  }
});

/**
 * PUT /api/tools/admin/:id/order
 * 도구 순서 변경
 */
router.put('/admin/:id/order', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const { id } = req.params;
    const { sort_order } = req.body;

    await Tool.updateOrder(id, sort_order);

    res.json({ success: true, message: '순서가 변경되었습니다.' });
  } catch (error) {
    console.error('[Tools Admin] 순서 변경 실패:', error);
    res.status(500).json({ success: false, message: '순서 변경에 실패했습니다.' });
  }
});

/**
 * PUT /api/tools/admin/:id
 * 도구 정보 수정
 */
router.put('/admin/:id', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const { id } = req.params;
    const updates = req.body;

    await Tool.update(id, updates);

    res.json({ success: true, message: '도구 정보가 수정되었습니다.' });
  } catch (error) {
    console.error('[Tools Admin] 도구 수정 실패:', error);
    res.status(500).json({ success: false, message: '도구 수정에 실패했습니다.' });
  }
});

/**
 * PUT /api/tools/admin/bulk-status
 * 일괄 상태 변경
 */
router.put('/admin/bulk-status', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const { tool_ids, is_active } = req.body;

    if (!Array.isArray(tool_ids) || tool_ids.length === 0) {
      return res.status(400).json({ success: false, message: '도구 ID 목록이 필요합니다.' });
    }

    await Tool.bulkUpdateStatus(tool_ids, is_active);

    res.json({ success: true, message: `${tool_ids.length}개의 도구 상태가 변경되었습니다.` });
  } catch (error) {
    console.error('[Tools Admin] 일괄 상태 변경 실패:', error);
    res.status(500).json({ success: false, message: '일괄 상태 변경에 실패했습니다.' });
  }
});

module.exports = router;
