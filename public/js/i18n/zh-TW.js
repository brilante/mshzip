// 繁體中文 언어 파일 (Chinese (Traditional) Language File)
// 중복 로드 시 재선언 오류 방지
if (typeof window.i18n_zhTW === 'undefined') {
window.i18n_zhTW = {
  // 헤더
  backButton: '← 返回',
  backButtonTitle: '返回主頁',

  // 좌측 메뉴
  menuBasic: '基本',
  menuAppearance: '外觀',
  menuAI: 'AI 設定',
  menuAccount: '帳戶',
  menuAbout: '關於',

  // Basic 섹션
  basicTitle: '基本設定',
  basicDescription: '配置心智圖的基本操作。',
  resetButton: '恢復預設值',

  autoSaveIntervalLabel: '自動儲存間隔',
  autoSaveIntervalDesc: '自動儲存心智圖的時間間隔（秒）',
  secondsUnit: '秒',

  defaultNodeExpandedLabel: '新節點展開狀態',
  defaultNodeExpandedDesc: '新建立節點的預設展開狀態',

  confirmDeleteLabel: '確認刪除',
  confirmDeleteDesc: '刪除節點時顯示確認訊息',

  // 에디터 설정
  editorSettingsTitle: '編輯器設定',
  editorFontSizeLabel: '編輯器字型大小',
  editorFontSizeDesc: 'Markdown 編輯器的字型大小',

  // 테마 설정
  themeSettingsTitle: '主題設定',
  appThemeLabel: '螢幕主題',
  appThemeDesc: '設定網頁的基本主題',
  themeLight: '一般模式',
  themeDark: '深色模式',

  // 언어 설정
  languageSettingsTitle: '語言設定',
  appLanguageLabel: '介面語言',
  appLanguageDesc: '選擇應用程式顯示語言',
  languageSearchPlaceholder: '搜尋語言...',
  searchButton: '搜尋',
  currentLanguageLabel: '目前：',

  // Appearance 섹션
  appearanceTitle: '外觀',
  appearanceDescription: '配置心智圖的外觀。',
  themeLabel: '主題',
  themeDesc: '應用程式的整體主題',

  // AI 섹션
  aiTitle: 'AI 設定',
  aiDescription: '配置 AI 服務整合。',
  defaultAIServiceLabel: '預設 AI 服務',
  defaultAIServiceDesc: '提問時使用的預設 AI 服務',

  // Account 섹션
  accountTitle: '帳戶',
  accountDescription: '管理帳戶資訊。',
  userIdLabel: '使用者 ID',
  userIdDesc: '目前登入的使用者',
  userEmailLabel: '電子郵件',
  userEmailDesc: '已註冊的電子郵件地址',

  // AI使用紀錄
  aiUsageTitle: 'AI 使用紀錄管理',
  viewUsageHistoryLabel: '查看使用紀錄',
  viewUsageHistoryDesc: '查看詳細的AI使用紀錄',
  viewHistoryBtn: '查看紀錄',
  usagePolicyInfo1: '紀錄政策：所有使用紀錄將在1年後自動刪除',
  usagePolicyInfo2: 'API金鑰用戶僅記錄使用量，不扣除點數',

  // Google雲端硬碟設定
  driveSettingsTitle: '雲端備份（Google 雲端硬碟）',
  driveConnectionLabel: '連線狀態',
  driveConnectionDesc: '與Google雲端硬碟的連線狀態',
  driveDisconnected: '未連線',
  driveConnected: '已連線',
  driveConnectLabel: '連接雲端硬碟',
  driveConnectDesc: '將心智圖備份到Google雲端硬碟',
  connectDriveBtn: '連接雲端硬碟',
  disconnectDriveBtn: '中斷連線',
  driveUserLabel: '已連線帳戶',
  driveUserDesc: '連接到雲端硬碟的Google帳戶',
  drivePathLabel: '備份路徑',
  drivePathDesc: '雲端硬碟中的備份儲存位置',
  driveQuotaLabel: '雲端硬碟使用量',
  driveQuotaDesc: 'Google雲端硬碟儲存使用量',

  driveConnecting: '正在跳轉到 Google 雲端硬碟認證頁面...',
  driveDisconnecting: '正在中斷雲端硬碟連線...',
  driveBackupInfo: '連接雲端硬碟後，備份將自動儲存到 Google 雲端硬碟',

  // 備份設定
  backupSettingsTitle: '備份',
  backupStatusLabel: '備份狀態',
  backupStatusDesc: '伺服器自動備份狀態',
  backupActive: '啟用',
  backupInactive: '停用',
  backupLocation: '位置',
  backupLocationLocal: '伺服器',
  nextBackupLabel: '下次備份',
  nextBackupDesc: '計劃的下次備份時間',
  lastBackupLabel: '上次備份',
  lastBackupDesc: '上次執行備份的時間',
  manualBackupLabel: '手動備份',
  manualBackupDesc: '立即執行備份',
  runBackupBtn: '立即備份',
  backupHistoryLabel: '備份紀錄',
  backupHistoryDesc: '查看已儲存的備份列表',
  viewBackupHistoryBtn: '查看紀錄',
  backupInfo: '伺服器備份最多保留30份，建立後1年（365天）後自動刪除。超過30份時，最舊的備份將被刪除。',

  // About 섹션
  aboutTitle: '關於',
  aboutDescription: '關於 MyMind3 的資訊。',
  aboutAppDescription: 'AI 整合心智圖應用程式',

  // 메인 페이지
  // 패널 헤더
  mindmapPanelTitle: '心智圖',
  nodePanelTitle: '節點內容',
  responsePanelTitle: '回應',

  // 툴팁
  toggleLeftPanel: '切換左側面板',
  toggleMiddlePanel: '切換中間面板',
  toggleRightPanel: '切換右側面板',
  copyNodeTooltip: '複製節點',
  settingsTooltip: '前往設定頁面',

  // 마인드맵 버튼
  addMainBtn: '新增主要',
  saveMapBtn: '儲存',
  loadMapBtn: '載入',
  resetMapBtn: '重置',

  // 콘텐츠 버튼
  saveContentBtn: '儲存',
  pdfBtn: 'PDF',
  pptBtn: 'PPT',
  graphModeBtn: '圖表',
  viewModeBtn: '檢視',
  editModeBtn: '編輯',

  // AI 패널 버튼
  apiKeyBtn: 'API Key',
  loginBtn: '登入',
  logoutBtn: '登出',
  sendBtn: '傳送',
  clearQaBtn: '清除',

  // 메시지
  selectNodeMessage: '選擇節點以查看內容。',
  questionPlaceholder: '請輸入您的問題...',

  // Save Folder Popup
  saveFolderTitle: '儲存資料夾',
  folderNamePlaceholder: '請輸入資料夾名稱',
  cancelBtn: '取消',
  saveBtn: '儲存',

  // Load Folder Popup
  loadFolderTitle: '載入資料夾',

  // Document Popup
  documentGenerationTitle: '文件生成',
  documentGenerationMessage: '使用所選節點的內容',
  documentGenerationMessage2: '生成文件。',
  existingDocumentLabel: '現有文件：',
  generateFileBtn: '生成',
  downloadBtn: '下載',

  // 額外按鈕和UI元素
  generateTreeBtn: '節點重組',
  createNodeBtn: '建立節點',
  confirmBtn: '確認',
  deleteBtn: '刪除',
  autoCreateNode: '自動建立',
  multiSelect: '多選',
  pageTitle: '心智圖',

  // 心智圖搜尋
  searchPlaceholder: '搜尋節點...',
  searchButton: '搜尋',
  searchResultCount: '找到{count}個',
  searchNoResults: '無結果',
  searchClear: '清除搜尋',
  searchEmptyQuery: '請輸入搜尋關鍵字。',
  searchShortcut: '按Ctrl+F搜尋',

  // 對話框訊息
  clearQaConfirmMsg: '確定要刪除所有Q&A記錄嗎？',
  generateFailed: '生成失敗',
  inputNodeTitle: '請輸入節點標題：',
  inputMainTitle: '請輸入主標題：',
  inputChildTitle: '請輸入新子節點的標題：',
  editNodeTitle: '請編輯節點標題：',
  deleteNodeConfirm: '確定要刪除「{title}」節點嗎？',
  deleteNodeWithChildren: '確定要刪除「{title}」節點和{count}個子節點嗎？',

  // 提示訊息
  autoNodeCreated: '「{title}」節點已自動建立。',
  noSelectedNode: '未選擇節點。',
  rootNodeLimit: '只能建立一個根節點。',

  // YouTube彈窗
  youtubeExtractTitle: 'YouTube文字擷取',
  youtubeUrlPlaceholder: '請輸入YouTube網址',
  extractBtn: '擷取',
  youtubeNodeCreated: '已從YouTube文字建立節點。',
  youtubeUrlLabel: 'YouTube 網址',
  youtubeExtractBtn: '擷取文字',
  youtubeExtracting: '擷取中...',
  youtubePreparing: '準備中...',
  youtubeExtractedText: '擷取的文字',
  copyBtn: '複製',

  // 登入彈窗
  loginTitle: '登入',
  loginUsernamePlaceholder: '輸入帳號',
  loginPasswordPlaceholder: '輸入密碼',
  loginBtn: '登入',

  // 面板切換工具提示
  toggleLeftPanel: '切換左側面板',
  toggleMiddlePanel: '切換中間面板',
  toggleRightPanel: '切換右側面板',
  searchClearTooltip: '清除搜尋',
  themeToggleTooltip: '切換至深色模式',
  themeToggleLightTooltip: '切換至淺色模式',
  settingsTooltip: '前往設定頁面',
  removeImageTooltip: '移除圖片',
  attachFileTooltip: '附加檔案（圖片/影片/音訊）',

  // PPT選項
  pptTemplateLabel: '範本',
  pptTemplateDefault: '預設 - 藍色系',
  pptTemplateBusiness: '商務 - 海軍藍專業版',
  pptTemplateEducation: '教育 - 親切綠色',
  pptTemplateCreative: '創意 - 漸層繽紛',
  pptTemplateMinimal: '簡約 - 黑白簡潔',
  pptTemplateDark: '深色 - 優雅深色模式',
  pptUploadBtn: '上傳',
  pptAIModelLabel: 'AI 模型選擇',
  pptAIModelDesc: '※ 選擇用於 GPT 內容改善的 AI 模型',
  pptKeyPointsLabel: '重點項目',
  pptKeyPointsPlaceholder: '例：成本節省效果、導入注意事項、競爭對手比較...',
  pptKeyPointsDesc: '※ PPT 內容將根據輸入的重點項目進行結構化',
  uploadTemplateTooltip: '上傳使用者範本',

  // 範本管理彈窗
  templateManageTitle: 'PPT 範本管理',
  templateTabUpload: '上傳範本',
  templateTabList: '我的範本',
  templateNameLabel: '範本名稱 *',
  templateNamePlaceholder: '例：我的公司範本',
  templateDescLabel: '說明（選填）',
  templateDescPlaceholder: '例：公司品牌色彩',
  templateColorSettings: '顏色設定',
  templateColorPrimary: '主要顏色',
  templateColorSecondary: '次要顏色',
  templateColorBg: '背景顏色',
  templateColorText: '文字顏色',
  templateFontSettings: '字型設定',
  templateFontTitleLabel: '標題字型',
  templateFontBodyLabel: '內文字型',
  templateTransitionLabel: '轉場效果',
  transitionFade: '淡化',
  transitionPush: '推移',
  transitionWipe: '擦除',
  transitionZoom: '縮放',
  transitionSplit: '分割',
  templateSaveBtn: '儲存範本',
  templateLoading: '載入範本中...',

  // Toast 訊息
  toastRootNodeLimit: '只能建立一個根節點。',
  toastLoadMindmapFirst: '請先載入心智圖。',
  toastQaDeleted: 'Q&A 記錄已刪除。',
  toastDeleteFailed: '刪除失敗',
  toastDeleteError: '刪除時發生錯誤。',
  toastInvalidYoutubeUrl: '請輸入有效的 YouTube 網址。',
  toastExtractionComplete: '文字擷取完成。',
  toastCopiedToClipboard: '已複製到剪貼簿。',
  toastCopyFailed: '複製失敗。',
  toastNoExtractedText: '沒有擷取的文字。',
  toastRootNodeExists: '根節點已存在。請重置或加入現有地圖。',
  toastNodeCreateFailed: '節點建立失敗。',
  toastNodeCreateError: '建立節點時發生錯誤。',
  toastLoginSuccess: '登入成功',
  toastLogoutSuccess: '已登出。',
  toastLogoutError: '登出時發生錯誤。',

  // Alert 訊息
  alertSelectNode: '未選擇節點。請選擇一個節點。',
  alertFileTypeError: '只能附加圖片、影片和音訊檔案。',
  alertNoAIService: '沒有啟用的 AI 服務。請在設定中啟用 AI 服務並設定 API 金鑰。',
  alertEnterMessage: '請輸入訊息。',
  alertOpenEditor: '請先開啟編輯器。（選擇節點）',
  alertImageCopyFailed: '圖片複製失敗。',
  alertImageDownloadFailed: '圖片下載失敗。',
  alertCopyFailed: '複製失敗。',
  alertEditorNotReady: '編輯器尚未準備就緒。',
  alertCopyError: '複製時發生錯誤。請再試一次。',
  alertNodeNotFound: '找不到節點資料。',
  alertEnterTemplateName: '請輸入範本名稱。',
  alertTemplateSaved: '範本已儲存！',
  alertSaveFailed: '儲存失敗',
  alertTemplateSaveError: '儲存範本時發生錯誤。',
  alertDeleteFailed: '刪除失敗',
  alertTemplateDeleteError: '刪除範本時發生錯誤。',
  alertSelectNodeFirst: '請先選擇節點。',
  alertFolderNotFound: '無法找到目前資料夾。',
  alertFolderOrNodeNotFound: '無法找到資料夾或節點。',
  alertAIProcessing: 'AI正在處理回應。點擊「處理中...」按鈕可取消。',
  alertAIBusy: 'AI正在處理其他請求。請稍候。',
  alertUnknownError: '未知錯誤',
  alertNodeDeleteError: '刪除節點時發生錯誤。',
  toastEnterYoutubeUrl: '請輸入YouTube網址。',
  loginFailed: '登入失敗',
  loginError: '登入時發生錯誤。',
  logoutConfirm: '確定要登出嗎？',
  noSelectedNode: '請選擇節點',

  // AI設定 - 新節點建立
  treeGenAILabel: '使用AI建立新節點',
  treeGenAIDesc: '生成新樹狀結構時使用的AI模型',
  primaryAILabel: 'Primary AI',
  secondaryAILabel: 'Secondary AI',

  // 其他選單
  etcMenuBtn: '其他 ▼',
  etcMenuYoutube: 'YouTube 文字擷取',
  etcMenu2: '選單2',
  etcMenu3: '選單3',
  etcMenu4: '選單4',
  etcMenu5: '選單5',
  etcMenu6: '選單6',
  etcMenu7: '選單7',
  etcMenu8: '選單8',
  etcMenu9: '選單9',

  // ===== 看板管理 (Board Admin) =====
  // 選單
  menuBoardAdmin: '看板管理',

  // 通用
  boardAdminTitle: '看板管理',
  boardAdminDesc: '建立和管理看板。',

  // 載入/錯誤狀態
  boardAdminLoading: '載入中...',
  boardAdminAuthExpired: '管理員認證已過期。請重新認證。',
  boardAdminAuthRequired: '需要管理員認證。',
  boardAdminLoadFailed: '無法載入看板列表。',
  boardAdminError: '發生錯誤。',

  // 空狀態
  boardAdminEmpty: '沒有建立的看板。',
  boardAdminEmptyDesc: '點擊建立看板按鈕以建立新看板。',

  // 表格標題
  boardAdminColOrder: '順序',
  boardAdminColIcon: '圖示',
  boardAdminColName: '名稱',
  boardAdminColKey: '鍵值',
  boardAdminColStatus: '狀態',
  boardAdminColPosts: '文章數',
  boardAdminColActions: '管理',

  // 狀態
  boardStatusPublic: '公開',
  boardStatusPrivate: '私密',
  boardToggleToPrivate: '設為私密',
  boardToggleToPublic: '設為公開',

  // 按鈕/動作
  boardBtnCreate: '建立看板',
  boardBtnWrite: '發表文章',
  boardBtnEdit: '編輯',
  boardBtnDelete: '刪除',
  boardBtnSave: '儲存',
  boardBtnCancel: '取消',
  boardBtnTranslate: '批量翻譯',

  // 翻譯相關
  boardTranslateConfirm: '將未翻譯的看板翻譯成多國語言嗎？\n(使用 Gemini 2.0 Flash AI)',
  boardTranslateProcessing: 'AI 翻譯進行中...',
  boardTranslateSuccess: '翻譯完成。',
  boardTranslateFailed: '翻譯失敗。',
  boardTranslateError: '翻譯時發生錯誤。',

  // 模態框
  boardModalTitleCreate: '建立看板',
  boardModalTitleEdit: '編輯看板',

  // 文章撰寫模態框
  postWriteTitle: '撰寫文章',
  postEditTitle: '編輯文章',
  postTitleLabel: '標題',
  postTitlePlaceholder: '請輸入標題',
  postContentLabel: '內容',
  postContentPlaceholder: '請輸入內容',
  postFileAttach: '檔案附件',
  postFileAttachDesc: '最多{count}個，每個{size}MB',
  postFileSelect: '選擇檔案',
  postFileAllowedExt: '允許的副檔名：{ext}',
  postFileAllowedExtSafe: '允許的副檔名：不包括執行檔',
  postBtnSubmit: '發布',
  postBtnUpdate: '更新',
  postBoardNotFound: '找不到看板資訊。',

  // 文章翻譯
  postTranslateBtn: '翻譯',
  postTranslating: '翻譯中...',
  postTranslated: '已翻譯',
  postTranslateError: '翻譯失敗。',

  // 表單標籤
  boardFormKey: '看板鍵值',
  boardFormKeyDesc: '僅限小寫字母、數字和連字號（用於網址）',
  boardFormKeyPlaceholder: '例如：notice, free, qna',
  boardFormName: '看板名稱',
  boardFormNamePlaceholder: '公告',
  boardFormDesc: '說明',
  boardFormDescPlaceholder: '輸入看板說明',
  boardFormIcon: '圖示',
  boardFormWritePermission: '寫入權限',
  boardFormReadPermission: '讀取權限',
  boardFormSortOrder: '顯示順序',
  boardFormAllowUpload: '允許檔案上傳',
  boardFormAllowComment: '允許留言',

  // 權限選項
  permissionAdmin: '僅管理員',
  permissionUser: '登入使用者',
  permissionAll: '所有人',

  // 驗證
  boardValidateKeyName: '請輸入看板鍵值和名稱。',
  boardValidateKeyFormat: '看板鍵值只能包含小寫字母、數字和連字號。',

  // 成功/失敗訊息
  boardSaveSuccess: '看板已儲存。',
  boardCreateSuccess: '看板已建立。',
  boardEditSuccess: '看板已更新。',
  boardDeleteSuccess: '看板已刪除。',
  boardSaveFailed: '儲存失敗。',
  boardDeleteFailed: '刪除失敗。',
  boardToggleFailed: '狀態變更失敗。',
  boardSaveError: '儲存時發生錯誤。',
  boardDeleteError: '刪除時發生錯誤。',
  boardToggleError: '狀態變更時發生錯誤。',

  // 確認訊息
  boardDeleteConfirm: '確定要刪除「{name}」看板嗎？',
  boardDeleteWarning: '此看板的所有文章和附件將被刪除。',

  // 勾選翻譯
  boardSelectAll: '全選',
  boardSelectedCount: '已選擇 {count} 個',
  boardTranslateNoSelection: '請選擇要翻譯的看板。',
  boardTranslateConfirmSelected: '翻譯 {count} 個看板？\n(使用 Gemini 2.0 Flash AI)',
  boardTranslateSelectedSuccess: '已完成 {count} 個看板的翻譯。',

  // 日誌搜尋 (管理員)
  menuLogSearch: '日誌搜尋',
  logSearchTitle: '日誌搜尋',
  logSearchDesc: '搜尋和管理系統錯誤日誌。',
  logGenerationLabel: '日誌生成',
  logGenerationDesc: '僅生成選中級別的日誌',
  logLevelLabel: '日誌級別',
  logLevelAll: '全部',
  logDateFromLabel: '開始日期',
  logDateToLabel: '結束日期',
  logPeriodPresetLabel: '時間段預設',
  logPeriodToday: '今天',
  logPeriod7Days: '7天',
  logPeriod30Days: '30天',
  logSourceLabel: '來源',
  logSourcePlaceholder: '來源過濾',
  logMessageLabel: '訊息',
  logMessagePlaceholder: '搜尋訊息',
  logStatusLabel: '狀態',
  logStatusAll: '全部',
  logStatusUnresolved: '未解決',
  logStatusResolved: '已解決',
  logSearchBtn: '搜尋',
  logResetBtn: '重置',
  logStatTotal: '總計',
  logTableLevel: '級別',
  logTableTime: '時間',
  logTableMessage: '訊息',
  logTableSource: '來源',
  logTableStatus: '狀態',
  logPrevBtn: '上一頁',
  logNextBtn: '下一頁 ',
  logPageInfo: '第 {current}/{total} 頁',

  // 日誌詳情彈窗
  logDetailTitle: '日誌詳細資訊',
  logDetailErrorId: 'Error ID',
  logDetailLevel: '級別',
  logDetailMessage: '訊息',
  logDetailSource: '來源',
  logDetailUser: '使用者',
  logDetailRequestPath: '請求路徑',
  logDetailCreatedAt: '建立時間',
  logDetailRetention: '保留期限',
  logDetailRetentionPermanent: '永久',
  logDetailRetentionDays: '{days}天',
  logDetailExpiresAt: '過期時間',
  logDetailExpiresNone: '無（永久）',
  logDetailStatus: '狀態',
  logDetailResolved: '已解決',
  logDetailUnresolved: '未解決',
  logDetailStackTrace: '堆疊追蹤',
  logDetailExtraInfo: '附加資訊',
  logDetailMarkResolved: '標記為已解決',
  logDetailMarkUnresolved: '標記為未解決',
  logDetailCopy: '複製',
  logDetailLoading: '正在載入日誌...',
  logDetailNoResults: '未找到搜尋結果。',
  logDetailLoadError: '日誌載入失敗',
  logDetailAuthRequired: '需要身份驗證。',
  logDetailStatusChangeError: '狀態變更失敗',
  logDetailCopySuccess: '已複製到剪貼簿。',
  logDetailCopyError: '複製失敗',

  // ===== 功能設定 (Feature Settings) =====
  menuFeatureSettings: '功能設定',
  featureSettingsTitle: '功能設定',
  featureSettingsDesc: '設定系統功能。',
  nodeRestructureTitle: '節點重構功能',
  nodeRestructureDesc: '設定是否顯示AI節點重構按鈕。',
  featureNodeRestructure: '節點重構',
  featureNodeRestructureDesc: 'AI分析心智圖結構並重新組織為最佳形式。',
  documentFeaturesTitle: '文件生成功能',
  documentFeaturesDesc: '設定是否顯示PPT/PDF按鈕。',
  featurePpt: 'PPT生成',
  featurePptDesc: '將心智圖轉換為PowerPoint簡報。',
  featurePdf: 'PDF生成',
  featurePdfDesc: '將心智圖轉換為PDF文件。',
  saveFeatureSettings: '儲存設定',
  featureSettingsSaved: '設定已儲存。',
  featureSettingsSaveError: '儲存設定時發生錯誤。',

  // ===== 환경 선택 (Environment Selector) =====
  envServerBadgeTitle: '目前伺服器環境',
  envLocal: '本機',
  envDevelopment: '開發',
  envProduction: '正式',

  // 크레딧 잔액 현황
  noCreditsMessage: '沒有可用的點數。',

  // v7.0: 구독 페이지 추가 번역
  subscriptionLite: '輕量版',
  subscriptionStandard: '標準版',
  subscriptionPro: '專業版',
  subscriptionMax: '高級版',
  baseUsageLabel: '基礎用量',
  bonusLabelText: '獎勵',
  targetPersonalHobby: '個人/愛好',
  targetRegularUser: '普通用戶',
  targetHeavyUser: '重度用戶',
  targetEnterprise: '重度用戶/企業',
  daysUsed: '天已使用',
  daysOf: '天中',
  daysRemaining: '天剩餘',
  proratedRefundTitle: '按比例退款',
  proratedRefundDesc: '取消時，您將自動獲得剩餘期間的按比例退款。',
  proratedRefundNote: '退款金額根據未使用期間計算。',
  refundPackageNameLabel: '訂閱套餐:',
  refundUsagePeriodLabel: '使用期間:',
  refundRemainingDaysLabel: '剩餘期間:',
  refundEstimatedAmountLabel: '預計退款金額:',
  refundCalculating: '正在計算退款信息...',
  baseCreditsLabel: '基礎積分:',
  bonusCreditsLabel: '獎勵',
  totalCreditsLabel: '總積分:',
  creditPurchaseNote: '注意:',
  creditNoExpiry: '永不過期，永久保留',
  freeCreditsLabel: 'Service Credits',
  serviceCreditsLabel: 'Subscription Credits',
  paidCreditsLabel: 'Standard Credits',
  purchaseBtn: '購買',

  // 결제 통화 설정
  currencyInfo: '匯率由伺服器即時管理。基準貨幣：USD',

  // AI Model Admin & Sync Logs
  menuModelSyncLogs: '同步日誌',
  aiModelSyncBtn: '同步',
  aiModelSyncTooltip: '將當前環境的AI模型設置同步到下一個環境',
  aiModelLocalAiUrl: 'Local AI 伺服器 URL',
  aiModelLocalAiUrlDesc: '管理員設定的 URL 將作為系統預設值套用。',
  aiModelLocalAiTest: '連線測試',
  aiModelLocalAiTesting: '測試中...',
  aiModelLocalAiConnected: '連線成功',
  aiModelLocalAiDisconnected: '連線失敗',
  aiModelLocalAiModelsFound: '個模型已發現',
  aiModelLocalAiUrlRequired: '請輸入 URL。',
  aiModelLocalAiUrlSaved: 'Local AI URL 已儲存。',
  aiModelLocalAiUrlSaveError: 'Local AI URL 儲存失敗。',
  aiModelLocalAiTestError: '連線測試期間發生錯誤。',
  modelSyncLogsTitle: '同步日誌',
  modelSyncLogsDesc: '檢查AI模型同步批處理執行結果。(超過7天的日誌將自動刪除)',
  modelSyncServiceLabel: 'AI服務',
  modelSyncStatusLabel: '狀態',
  filterAll: '全部',
  syncStatusSuccess: '成功',
  syncStatusFailed: '失敗',
  modelSyncRunBtn: '手動執行',
  modelSyncRunTooltip: '手動執行AI模型同步',
  syncStatAdded: '添加',
  syncStatDeprecated: 'Deprecated',
  syncStatLastSync: '最後同步',
  syncTableDate: '日期',
  syncTableService: 'AI服務',
  syncTableStatus: '狀態',
  syncTableFound: '發現',
  syncTableAdded: '添加',
  syncTableModified: '修改',
  syncTableDeprecated: 'Deprecated',
  syncTableResponseTime: '響應時間',
  syncTableMessage: '訊息',
  syncDeleteBtn: '刪除',
  syncDeleteAllTooltip: '刪除所有日誌',
  syncPageInfo: '頁面 {current}/{total}',

  // 右鍵選單（節點右鍵）
  ctxCopyNodeId: '複製節點ID',
  ctxNodeFilter: '節點篩選',
  ctxAddChild: '新增子節點',
  ctxAddSibling: '新增兄弟節點',
  ctxEditTitle: '編輯標題',
  ctxDeleteNode: '刪除節點',
  ctxToggleSubtreeCheck: '子節點切換',
  ctxNoSelectedNode: '未選擇節點',
  ctxNodeIdCopied: '節點ID已複製: ',
  ctxEnterNewNodeTitle: '請輸入新節點標題:',
  ctxEditNodeTitle: '編輯節點標題:',
  ctxCopyFailed: '複製失敗',
  ctxEnterSiblingTitle: '請輸入新兄弟節點標題:'
};
} // if (typeof window.i18n_zhTW === 'undefined')
