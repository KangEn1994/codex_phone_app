const state = {
  runtime: detectRuntime(),
  booting: true,
  uiLanguage: "zh-CN",
  user: null,
  loginError: "",
  workspaces: [],
  sessions: [],
  selectedSessionId: null,
  messages: [],
  runs: [],
  liveEvents: [],
  system: null,
  ws: null,
  wsConnected: false,
  wsReconnectAttempts: 0,
  wsReconnectTimer: null,
  wsSessionId: null,
  sessionPollTimer: null,
  sessionFx: null,
  sessionFxTimer: null,
  mobileTab: "inbox",
  expandedWorkspacePaths: {},
  composeMode: "resume",
  composePrompt: "",
  newSessionPrompt: "",
  newSessionCwd: "",
  busy: false,
  passwordCurrent: "",
  passwordNext: "",
  passwordConfirm: "",
  passwordSaving: false,
  settingsModel: "",
  settingsEffort: "medium",
  settingsUiLanguage: "zh-CN",
  settingsTerminalApp: "terminal",
  settingsSandboxMode: "workspace-write",
  settingsApprovalPolicy: "never",
  settingsGitWriteEnabled: false,
  settingsGitWriteSandboxMode: "danger-full-access",
  settingsGitWriteApprovalPolicy: "on-request",
  settingsSaving: false,
  runPanelExpanded: false,
  newSessionExpanded: false,
  shouldScrollSessionBottom: false,
  openSessionMenuId: null,
  sessionSearchQuery: "",
  sessionFilter: "all",
};

const UI_LANGUAGE_OPTIONS = [
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "ar", label: "العربية" },
  { value: "ru", label: "Русский" },
  { value: "th", label: "ไทย" },
];

const RTL_UI_LANGUAGES = new Set(["ar"]);
const UI_LANGUAGE_STORAGE_KEY = "codexapp.ui_language";

const I18N = {
  "zh-CN": {
    "meta.appTitle": "Codex CLI Web Console",
    "common.notSet": "未设置",
    "common.unknown": "未知",
    "common.none": "暂无",
    "common.you": "你",
    "common.codexThread": "Codex 线程",
    "common.defaultModel": "默认模型",
    "time.justNow": "刚刚",
    "reasoning.low": "低",
    "reasoning.medium": "中",
    "reasoning.high": "高",
    "reasoning.xhigh": "超高",
    "sandbox.read-only": "只读",
    "sandbox.workspace-write": "工作区可写",
    "sandbox.danger-full-access": "完全访问",
    "approval.untrusted": "仅非信任命令审批",
    "approval.on-request": "按需审批",
    "approval.never": "永不审批",
    "gitWrite.enabled": "已开启",
    "gitWrite.disabled": "未开启",
    "status.ready": "空闲",
    "status.queued": "排队中",
    "status.running": "执行中",
    "status.failed": "失败",
    "status.cancelled": "已取消",
    "status.completed": "已完成",
    "status.unknown": "未知",
    "sidebar.searchLabel": "检索会话",
    "sidebar.searchPlaceholder": "搜索标题、路径、分支、prompt",
    "sidebar.filter.all": "全部",
    "sidebar.filter.active": "进行中",
    "sidebar.filter.failed": "失败",
    "sidebar.filter.ready": "空闲",
    "sidebar.countSummary": "当前显示 {shown} / {total} 条会话",
    "login.eyebrow": "Codex CLI Web Console",
    "login.title": "登录到你的远程会话控制台",
    "login.subtitle": "工作台分为项目列表、当前会话、设置三块，交互逻辑参考 old 版。",
    "login.username": "用户名",
    "login.password": "密码",
    "login.submit": "登录",
    "login.failed": "登录失败",
    "sidebar.eyebrow": "Projects",
    "sidebar.title": "项目列表",
    "sidebar.summary.mobile": "项目下展示受管会话，移动端继续复用同一套后端会话。",
    "sidebar.summary.desktop": "项目下展示受管会话，每张卡片都可以直接继续或在终端打开。",
    "sidebar.newSession": "新会话",
    "newSession.eyebrow": "New Session",
    "newSession.title": "在项目列表里新建",
    "newSession.subtitle.mobile": "先选择项目，再输入首条 prompt。",
    "newSession.subtitle.desktop": "这里负责选择项目文件夹并输入首条 prompt。",
    "newSession.workspaceLabel": "项目文件夹",
    "newSession.workspacePlaceholder": "/Users/you/codex/project",
    "newSession.initialPromptLabel": "首条 prompt",
    "newSession.initialPromptPlaceholder": "输入第一条消息，创建新的执行会话",
    "newSession.collapse": "收起",
    "newSession.createAndRun": "创建并运行",
    "newSession.creating": "创建中...",
    "project.sessionCount": "{count} 条会话",
    "project.noUpdates": "暂无更新",
    "project.new": "新建",
    "session.unnamed": "未命名会话",
    "session.projectUnknown": "项目未知",
    "session.branch": "分支 {branch}",
    "session.actionMenu": "操作",
    "session.continue": "继续会话",
    "session.openTerminal": "终端打开",
    "session.rename": "改名",
    "session.moveUp": "上移",
    "session.moveDown": "下移",
    "session.delete": "删除",
    "workspace.empty": "这个项目下暂时还没有会话。",
    "workspace.noManaged": "还没有受管会话，可以先在这里新建一个。",
    "messages.emptySelect": "先在左侧项目列表中选择一个会话，或者在那里新建一个。",
    "messages.emptyNoMessages": "这个会话还没有可见消息，运行开始后会自动出现。",
    "run.eyebrow": "Run Status",
    "run.idle": "当前空闲",
    "run.cancel": "取消",
    "run.expand": "展开",
    "run.collapse": "收起",
    "run.noInfo": "当前还没有值得展示的运行信息。",
    "composer.label": "继续当前会话",
    "composer.placeholder": "继续这个会话，例如：顺便补上测试和回滚方案",
    "composer.sending": "发送中...",
    "composer.submit": "发送到当前会话",
    "current.eyebrow": "Current Session",
    "current.title": "当前会话",
    "current.selectHint": "选择左侧会话，或者先到项目列表里新建一个",
    "current.sessionId": "会话 ID",
    "current.repo": "仓库",
    "current.branch": "分支",
    "current.unrecognized": "未识别",
    "current.status": "当前状态",
    "current.latestRun": "最近一次运行",
    "current.noneYet": "暂无",
    "current.latestPrompt": "最近一次 prompt",
    "current.noResumePrompt": "还没有输入过继续指令",
    "current.verification": "执行判断",
    "conversation.eyebrow": "Conversation",
    "conversation.title": "历史消息与继续对话",
    "settings.eyebrow": "Settings",
    "settings.title": "设置",
    "settings.subtitle": "模型名、思考强度和界面语言统一在这里选择，新建和继续都会使用这里的默认值。",
    "settings.logout": "退出",
    "settings.codexCli": "Codex CLI",
    "settings.notDetected": "未检测到",
    "settings.notConfigured": "未配置",
    "settings.defaultModel": "默认模型",
    "settings.reasoning": "思考强度",
    "settings.language": "界面语言",
    "settings.terminalApp": "终端软件",
    "settings.defaultExecution": "默认执行权限",
    "settings.defaultApproval": "默认审批策略",
    "settings.gitWriteEscalation": "Git 写提权",
    "settings.gitWritePermissions": "Git 提权权限",
    "settings.followDefault": "跟随默认",
    "execution.eyebrow": "Execution",
    "execution.title.mobile": "默认模型、语言与执行权限",
    "execution.title.desktop": "默认模型、语言、终端与执行权限",
    "settings.modelName": "模型名称",
    "settings.modelPlaceholder": "例如 gpt-5.4",
    "settings.sandbox": "Sandbox 权限",
    "settings.approval": "审批策略",
    "settings.allowGitWrite": "允许 Git 写操作提权",
    "settings.gitWriteHint.mobile": "命中 git add、git commit、分支改写等请求时，自动切换到下面这组权限。",
    "settings.gitWriteHint.desktop": "命中 git add、git commit、分支改写等请求时，自动切换到下面这组权限；“终端打开”也会使用它。",
    "settings.gitWriteSandbox": "Git 写操作 Sandbox",
    "settings.gitWriteApproval": "Git 写操作审批",
    "settings.scopeHint.mobile": "这些设置只作用于 CodexApp 的 Web 执行入口，不会再改你的主 Codex 配置文件。",
    "settings.scopeHint.desktop": "这些设置只作用于 CodexApp 的 Web 执行与“终端打开”入口，不会再改你的主 Codex 配置文件。",
    "settings.saving": "保存中...",
    "settings.save": "保存设置",
    "security.eyebrow": "Security",
    "security.title": "修改登录密码",
    "security.currentPassword": "当前密码",
    "security.newPassword": "新密码",
    "security.confirmPassword": "确认新密码",
    "security.clear": "清空",
    "security.saving": "保存中...",
    "security.save": "修改密码",
    "tabs.projects": "项目列表",
    "tabs.session": "当前会话",
    "tabs.settings": "设置",
    "prompt.rename": "输入新的会话名称",
    "prompt.renameEmpty": "会话名称不能为空",
    "prompt.renameFailed": "改名失败",
    "prompt.deleteConfirm": "确认删除会话 {name} 吗？",
    "prompt.deleteFailed": "删除失败",
    "prompt.reorderFailed": "调整顺序失败",
    "prompt.openTerminalFailed": "终端打开失败",
    "prompt.cancelFailed": "取消失败",
    "prompt.submitFailed": "提交失败",
    "prompt.saveSettingsFailed": "保存设置失败",
    "prompt.passwordUpdated": "密码已更新",
    "prompt.passwordChangeFailed": "修改密码失败",
    "prompt.continueFailed": "继续会话失败",
    "event.sessionConnected": "会话已接通",
    "event.threadCreated": "Codex thread 已创建",
    "event.threadId": "Codex thread: {id}",
    "event.assistantResult": "助手产出了一段结果",
    "event.turnCompleted": "本轮执行完成",
    "event.outputTokens": "输出 tokens: {tokens}",
    "event.cliCompleted": "CLI 已发出完成事件",
    "event.logError": "运行日志报错",
    "event.cliLog": "CLI 日志",
    "highlight.currentStatus": "当前状态",
    "highlight.finalReply": "最终回复",
    "highlight.failureReason": "失败原因",
    "highlight.startedAt": " · 启动于 {time}",
    "highlight.endedAt": " · 结束于 {time}",
    "verification.noRuns": "暂无运行记录",
    "verification.failed": "最近一次执行失败",
    "verification.cancelled": "最近一次执行已取消",
    "verification.running": "正在执行",
    "verification.queued": "等待执行",
    "verification.hasResult": "已有结果，可继续推进",
    "verification.noSummary": "执行结束，未见最终摘要",
    "loading.message": "Loading Codex console…",
    "api.invalidJson": "响应不是有效 JSON",
    "api.requestFailed": "请求失败：{status}",
  },
  "zh-TW": {
    "meta.appTitle": "Codex CLI Web Console",
    "common.notSet": "未設定",
    "common.unknown": "未知",
    "common.none": "暫無",
    "common.you": "你",
    "common.codexThread": "Codex 執行緒",
    "common.defaultModel": "預設模型",
    "time.justNow": "剛剛",
    "reasoning.low": "低",
    "reasoning.medium": "中",
    "reasoning.high": "高",
    "reasoning.xhigh": "超高",
    "sandbox.read-only": "唯讀",
    "sandbox.workspace-write": "工作區可寫",
    "sandbox.danger-full-access": "完全存取",
    "approval.untrusted": "僅非信任指令審批",
    "approval.on-request": "按需審批",
    "approval.never": "永不審批",
    "gitWrite.enabled": "已開啟",
    "gitWrite.disabled": "未開啟",
    "status.ready": "空閒",
    "status.queued": "排隊中",
    "status.running": "執行中",
    "status.failed": "失敗",
    "status.cancelled": "已取消",
    "status.completed": "已完成",
    "status.unknown": "未知",
    "sidebar.searchLabel": "搜尋會話",
    "sidebar.searchPlaceholder": "搜尋標題、路徑、分支、prompt",
    "sidebar.filter.all": "全部",
    "sidebar.filter.active": "進行中",
    "sidebar.filter.failed": "失敗",
    "sidebar.filter.ready": "空閒",
    "sidebar.countSummary": "目前顯示 {shown} / {total} 筆會話",
    "login.eyebrow": "Codex CLI Web Console",
    "login.title": "登入你的遠端會話主控台",
    "login.subtitle": "工作台分成專案列表、目前會話、設定三塊，互動邏輯延續 old 版。",
    "login.username": "使用者名稱",
    "login.password": "密碼",
    "login.submit": "登入",
    "login.failed": "登入失敗",
    "sidebar.eyebrow": "Projects",
    "sidebar.title": "專案列表",
    "sidebar.summary.mobile": "專案下顯示受管會話，行動端沿用同一套後端會話。",
    "sidebar.summary.desktop": "專案下顯示受管會話，每張卡片都能直接繼續或在終端開啟。",
    "sidebar.newSession": "新會話",
    "newSession.eyebrow": "New Session",
    "newSession.title": "在專案列表中建立",
    "newSession.subtitle.mobile": "先選擇專案，再輸入第一條 prompt。",
    "newSession.subtitle.desktop": "在這裡選擇專案資料夾並輸入第一條 prompt。",
    "newSession.workspaceLabel": "專案資料夾",
    "newSession.workspacePlaceholder": "/Users/you/codex/project",
    "newSession.initialPromptLabel": "第一條 prompt",
    "newSession.initialPromptPlaceholder": "輸入第一條訊息，建立新的執行會話",
    "newSession.collapse": "收起",
    "newSession.createAndRun": "建立並執行",
    "newSession.creating": "建立中...",
    "project.sessionCount": "{count} 筆會話",
    "project.noUpdates": "暫無更新",
    "project.new": "新增",
    "session.unnamed": "未命名會話",
    "session.projectUnknown": "專案未知",
    "session.branch": "分支 {branch}",
    "session.actionMenu": "操作",
    "session.continue": "繼續會話",
    "session.openTerminal": "終端開啟",
    "session.rename": "重新命名",
    "session.moveUp": "上移",
    "session.moveDown": "下移",
    "session.delete": "刪除",
    "workspace.empty": "這個專案下暫時還沒有會話。",
    "workspace.noManaged": "還沒有受管會話，可以先在這裡建立一個。",
    "messages.emptySelect": "先在左側專案列表選一個會話，或是在那裡新建一個。",
    "messages.emptyNoMessages": "這個會話目前還沒有可見訊息，執行開始後會自動出現。",
    "run.eyebrow": "Run Status",
    "run.idle": "目前空閒",
    "run.cancel": "取消",
    "run.expand": "展開",
    "run.collapse": "收起",
    "run.noInfo": "目前還沒有值得顯示的執行資訊。",
    "composer.label": "繼續目前會話",
    "composer.placeholder": "繼續這個會話，例如：順便補上測試和回滾方案",
    "composer.sending": "傳送中...",
    "composer.submit": "傳送到目前會話",
    "current.eyebrow": "Current Session",
    "current.title": "目前會話",
    "current.selectHint": "選擇左側會話，或先到專案列表建立一個",
    "current.sessionId": "會話 ID",
    "current.repo": "倉庫",
    "current.branch": "分支",
    "current.unrecognized": "未辨識",
    "current.status": "目前狀態",
    "current.latestRun": "最近一次執行",
    "current.noneYet": "暫無",
    "current.latestPrompt": "最近一次 prompt",
    "current.noResumePrompt": "還沒有輸入過後續指令",
    "current.verification": "執行判斷",
    "conversation.eyebrow": "Conversation",
    "conversation.title": "歷史訊息與繼續對話",
    "settings.eyebrow": "Settings",
    "settings.title": "設定",
    "settings.subtitle": "模型名稱、思考強度和介面語言統一在這裡選擇，新建和繼續都會使用這些預設值。",
    "settings.logout": "登出",
    "settings.codexCli": "Codex CLI",
    "settings.notDetected": "未偵測到",
    "settings.notConfigured": "未設定",
    "settings.defaultModel": "預設模型",
    "settings.reasoning": "思考強度",
    "settings.language": "介面語言",
    "settings.terminalApp": "終端軟體",
    "settings.defaultExecution": "預設執行權限",
    "settings.defaultApproval": "預設審批策略",
    "settings.gitWriteEscalation": "Git 寫入提權",
    "settings.gitWritePermissions": "Git 提權權限",
    "settings.followDefault": "跟隨預設",
    "execution.eyebrow": "Execution",
    "execution.title.mobile": "預設模型、語言與執行權限",
    "execution.title.desktop": "預設模型、語言、終端與執行權限",
    "settings.modelName": "模型名稱",
    "settings.modelPlaceholder": "例如 gpt-5.4",
    "settings.sandbox": "Sandbox 權限",
    "settings.approval": "審批策略",
    "settings.allowGitWrite": "允許 Git 寫入提權",
    "settings.gitWriteHint.mobile": "命中 git add、git commit、分支改寫等請求時，自動切換到下面這組權限。",
    "settings.gitWriteHint.desktop": "命中 git add、git commit、分支改寫等請求時，自動切換到下面這組權限；「終端開啟」也會使用它。",
    "settings.gitWriteSandbox": "Git 寫入 Sandbox",
    "settings.gitWriteApproval": "Git 寫入審批",
    "settings.scopeHint.mobile": "這些設定只作用於 CodexApp 的 Web 執行入口，不會修改你的主 Codex 設定檔。",
    "settings.scopeHint.desktop": "這些設定只作用於 CodexApp 的 Web 執行與「終端開啟」入口，不會修改你的主 Codex 設定檔。",
    "settings.saving": "儲存中...",
    "settings.save": "儲存設定",
    "security.eyebrow": "Security",
    "security.title": "修改登入密碼",
    "security.currentPassword": "目前密碼",
    "security.newPassword": "新密碼",
    "security.confirmPassword": "確認新密碼",
    "security.clear": "清空",
    "security.saving": "儲存中...",
    "security.save": "修改密碼",
    "tabs.projects": "專案列表",
    "tabs.session": "目前會話",
    "tabs.settings": "設定",
    "prompt.rename": "輸入新的會話名稱",
    "prompt.renameEmpty": "會話名稱不能為空",
    "prompt.renameFailed": "重新命名失敗",
    "prompt.deleteConfirm": "確認刪除會話 {name} 嗎？",
    "prompt.deleteFailed": "刪除失敗",
    "prompt.reorderFailed": "調整順序失敗",
    "prompt.openTerminalFailed": "終端開啟失敗",
    "prompt.cancelFailed": "取消失敗",
    "prompt.submitFailed": "提交失敗",
    "prompt.saveSettingsFailed": "儲存設定失敗",
    "prompt.passwordUpdated": "密碼已更新",
    "prompt.passwordChangeFailed": "修改密碼失敗",
    "prompt.continueFailed": "繼續會話失敗",
    "event.sessionConnected": "會話已接通",
    "event.threadCreated": "Codex thread 已建立",
    "event.threadId": "Codex thread: {id}",
    "event.assistantResult": "助手產出了一段結果",
    "event.turnCompleted": "本輪執行完成",
    "event.outputTokens": "輸出 tokens: {tokens}",
    "event.cliCompleted": "CLI 已發出完成事件",
    "event.logError": "執行日誌報錯",
    "event.cliLog": "CLI 日誌",
    "highlight.currentStatus": "目前狀態",
    "highlight.finalReply": "最終回覆",
    "highlight.failureReason": "失敗原因",
    "highlight.startedAt": " · 啟動於 {time}",
    "highlight.endedAt": " · 結束於 {time}",
    "verification.noRuns": "暫無執行記錄",
    "verification.failed": "最近一次執行失敗",
    "verification.cancelled": "最近一次執行已取消",
    "verification.running": "正在執行",
    "verification.queued": "等待執行",
    "verification.hasResult": "已有結果，可繼續推進",
    "verification.noSummary": "執行結束，未見最終摘要",
    "loading.message": "Loading Codex console…",
    "api.invalidJson": "回應不是有效 JSON",
    "api.requestFailed": "請求失敗：{status}",
  },
  en: {
    "meta.appTitle": "Codex CLI Web Console",
    "common.notSet": "Not set",
    "common.unknown": "Unknown",
    "common.none": "None",
    "common.you": "You",
    "common.codexThread": "Codex thread",
    "common.defaultModel": "Default model",
    "time.justNow": "just now",
    "reasoning.low": "Low",
    "reasoning.medium": "Medium",
    "reasoning.high": "High",
    "reasoning.xhigh": "Very High",
    "sandbox.read-only": "Read only",
    "sandbox.workspace-write": "Workspace write",
    "sandbox.danger-full-access": "Full access",
    "approval.untrusted": "Untrusted only",
    "approval.on-request": "On request",
    "approval.never": "Never",
    "gitWrite.enabled": "Enabled",
    "gitWrite.disabled": "Disabled",
    "status.ready": "Idle",
    "status.queued": "Queued",
    "status.running": "Running",
    "status.failed": "Failed",
    "status.cancelled": "Cancelled",
    "status.completed": "Completed",
    "status.unknown": "Unknown",
    "sidebar.searchLabel": "Search sessions",
    "sidebar.searchPlaceholder": "Search title, path, branch, prompt",
    "sidebar.filter.all": "All",
    "sidebar.filter.active": "Active",
    "sidebar.filter.failed": "Failed",
    "sidebar.filter.ready": "Idle",
    "sidebar.countSummary": "Showing {shown} / {total} sessions",
    "login.eyebrow": "Codex CLI Web Console",
    "login.title": "Sign in to your remote session console",
    "login.subtitle": "Projects, the current session, and settings follow the old workflow.",
    "login.username": "Username",
    "login.password": "Password",
    "login.submit": "Sign In",
    "login.failed": "Sign-in failed",
    "sidebar.eyebrow": "Projects",
    "sidebar.title": "Project List",
    "sidebar.summary.mobile": "Managed sessions are grouped by project. Mobile reuses the same backend sessions.",
    "sidebar.summary.desktop": "Managed sessions are grouped by project. Each card can continue directly or open in Terminal.",
    "sidebar.newSession": "New Session",
    "newSession.eyebrow": "New Session",
    "newSession.title": "Create from the project list",
    "newSession.subtitle.mobile": "Pick a project first, then enter the first prompt.",
    "newSession.subtitle.desktop": "Choose a project folder and enter the first prompt here.",
    "newSession.workspaceLabel": "Project folder",
    "newSession.workspacePlaceholder": "/Users/you/codex/project",
    "newSession.initialPromptLabel": "First prompt",
    "newSession.initialPromptPlaceholder": "Enter the first message to create a new execution session",
    "newSession.collapse": "Collapse",
    "newSession.createAndRun": "Create and Run",
    "newSession.creating": "Creating...",
    "project.sessionCount": "{count} sessions",
    "project.noUpdates": "No updates",
    "project.new": "New",
    "session.unnamed": "Untitled Session",
    "session.projectUnknown": "Unknown Project",
    "session.branch": "Branch {branch}",
    "session.actionMenu": "Actions",
    "session.continue": "Continue",
    "session.openTerminal": "Open in Terminal",
    "session.rename": "Rename",
    "session.moveUp": "Move Up",
    "session.moveDown": "Move Down",
    "session.delete": "Delete",
    "workspace.empty": "No sessions in this project yet.",
    "workspace.noManaged": "No managed sessions yet. Create one here first.",
    "messages.emptySelect": "Select a session on the left, or create one in the project list first.",
    "messages.emptyNoMessages": "This session has no visible messages yet. They will appear once the run starts.",
    "run.eyebrow": "Run Status",
    "run.idle": "Currently Idle",
    "run.cancel": "Cancel",
    "run.expand": "Expand",
    "run.collapse": "Collapse",
    "run.noInfo": "There is no run information worth showing yet.",
    "composer.label": "Continue Current Session",
    "composer.placeholder": "Continue this session, for example: also add tests and rollback steps",
    "composer.sending": "Sending...",
    "composer.submit": "Send to Current Session",
    "current.eyebrow": "Current Session",
    "current.title": "Current Session",
    "current.selectHint": "Select a session on the left, or create one in the project list first",
    "current.sessionId": "Session ID",
    "current.repo": "Repo",
    "current.branch": "Branch",
    "current.unrecognized": "Unrecognized",
    "current.status": "Current Status",
    "current.latestRun": "Latest Run",
    "current.noneYet": "None yet",
    "current.latestPrompt": "Latest Prompt",
    "current.noResumePrompt": "No follow-up prompt has been entered yet",
    "current.verification": "Execution Assessment",
    "conversation.eyebrow": "Conversation",
    "conversation.title": "History and Continue",
    "settings.eyebrow": "Settings",
    "settings.title": "Settings",
    "settings.subtitle": "Choose the model, reasoning level, and interface language here. New and resumed runs use these defaults.",
    "settings.logout": "Sign Out",
    "settings.codexCli": "Codex CLI",
    "settings.notDetected": "Not detected",
    "settings.notConfigured": "Not configured",
    "settings.defaultModel": "Default Model",
    "settings.reasoning": "Reasoning Level",
    "settings.language": "Interface Language",
    "settings.terminalApp": "Terminal App",
    "settings.defaultExecution": "Default Sandbox",
    "settings.defaultApproval": "Default Approval Policy",
    "settings.gitWriteEscalation": "Git Write Escalation",
    "settings.gitWritePermissions": "Git Escalation Permissions",
    "settings.followDefault": "Follow default",
    "execution.eyebrow": "Execution",
    "execution.title.mobile": "Default Model, Language, and Permissions",
    "execution.title.desktop": "Default Model, Language, Terminal, and Permissions",
    "settings.modelName": "Model Name",
    "settings.modelPlaceholder": "for example gpt-5.4",
    "settings.sandbox": "Sandbox Permissions",
    "settings.approval": "Approval Policy",
    "settings.allowGitWrite": "Allow Git write escalation",
    "settings.gitWriteHint.mobile": "When requests include git add, git commit, or branch rewrites, switch automatically to the permissions below.",
    "settings.gitWriteHint.desktop": "When requests include git add, git commit, or branch rewrites, switch automatically to the permissions below. \"Open in Terminal\" uses them too.",
    "settings.gitWriteSandbox": "Git Write Sandbox",
    "settings.gitWriteApproval": "Git Write Approval",
    "settings.scopeHint.mobile": "These settings only affect CodexApp's web execution entry and do not rewrite your main Codex config file.",
    "settings.scopeHint.desktop": "These settings only affect CodexApp's web execution and \"Open in Terminal\" entry and do not rewrite your main Codex config file.",
    "settings.saving": "Saving...",
    "settings.save": "Save Settings",
    "security.eyebrow": "Security",
    "security.title": "Change Login Password",
    "security.currentPassword": "Current Password",
    "security.newPassword": "New Password",
    "security.confirmPassword": "Confirm New Password",
    "security.clear": "Clear",
    "security.saving": "Saving...",
    "security.save": "Change Password",
    "tabs.projects": "Projects",
    "tabs.session": "Session",
    "tabs.settings": "Settings",
    "prompt.rename": "Enter a new session name",
    "prompt.renameEmpty": "Session name cannot be empty",
    "prompt.renameFailed": "Rename failed",
    "prompt.deleteConfirm": "Delete session {name}?",
    "prompt.deleteFailed": "Delete failed",
    "prompt.reorderFailed": "Reorder failed",
    "prompt.openTerminalFailed": "Failed to open in Terminal",
    "prompt.cancelFailed": "Cancel failed",
    "prompt.submitFailed": "Submission failed",
    "prompt.saveSettingsFailed": "Failed to save settings",
    "prompt.passwordUpdated": "Password updated",
    "prompt.passwordChangeFailed": "Failed to change password",
    "prompt.continueFailed": "Failed to continue session",
    "event.sessionConnected": "Session connected",
    "event.threadCreated": "Codex thread created",
    "event.threadId": "Codex thread: {id}",
    "event.assistantResult": "Assistant produced a result",
    "event.turnCompleted": "This run is complete",
    "event.outputTokens": "Output tokens: {tokens}",
    "event.cliCompleted": "CLI emitted a completion event",
    "event.logError": "Run log error",
    "event.cliLog": "CLI log",
    "highlight.currentStatus": "Current Status",
    "highlight.finalReply": "Final Reply",
    "highlight.failureReason": "Failure Reason",
    "highlight.startedAt": " · started {time}",
    "highlight.endedAt": " · ended {time}",
    "verification.noRuns": "No runs yet",
    "verification.failed": "The last run failed",
    "verification.cancelled": "The last run was cancelled",
    "verification.running": "Running now",
    "verification.queued": "Waiting to run",
    "verification.hasResult": "A result is available. You can keep going.",
    "verification.noSummary": "The run ended without a final summary",
    "loading.message": "Loading Codex console…",
    "api.invalidJson": "Response is not valid JSON",
    "api.requestFailed": "Request failed: {status}",
  },
  ja: {
    "meta.appTitle": "Codex CLI Web Console",
    "common.notSet": "未設定",
    "common.unknown": "不明",
    "common.none": "なし",
    "common.you": "あなた",
    "common.codexThread": "Codex スレッド",
    "common.defaultModel": "デフォルトモデル",
    "time.justNow": "たった今",
    "reasoning.low": "低",
    "reasoning.medium": "中",
    "reasoning.high": "高",
    "reasoning.xhigh": "最高",
    "sandbox.read-only": "読み取り専用",
    "sandbox.workspace-write": "ワークスペース書き込み可",
    "sandbox.danger-full-access": "フルアクセス",
    "approval.untrusted": "非信頼コマンドのみ承認",
    "approval.on-request": "要求時",
    "approval.never": "不要",
    "gitWrite.enabled": "有効",
    "gitWrite.disabled": "無効",
    "status.ready": "待機中",
    "status.queued": "キュー中",
    "status.running": "実行中",
    "status.failed": "失敗",
    "status.cancelled": "キャンセル済み",
    "status.completed": "完了",
    "status.unknown": "不明",
    "sidebar.searchLabel": "セッションを検索",
    "sidebar.searchPlaceholder": "タイトル、パス、ブランチ、prompt を検索",
    "sidebar.filter.all": "すべて",
    "sidebar.filter.active": "進行中",
    "sidebar.filter.failed": "失敗",
    "sidebar.filter.ready": "待機中",
    "sidebar.countSummary": "{shown} / {total} 件のセッションを表示",
    "login.eyebrow": "Codex CLI Web Console",
    "login.title": "リモートセッションコンソールにログイン",
    "login.subtitle": "プロジェクト一覧、現在のセッション、設定の 3 画面で old 版の流れを引き継ぎます。",
    "login.username": "ユーザー名",
    "login.password": "パスワード",
    "login.submit": "ログイン",
    "login.failed": "ログインに失敗しました",
    "sidebar.eyebrow": "Projects",
    "sidebar.title": "プロジェクト一覧",
    "sidebar.summary.mobile": "管理対象セッションをプロジェクト単位で表示します。モバイルでも同じバックエンドセッションを使います。",
    "sidebar.summary.desktop": "管理対象セッションをプロジェクト単位で表示します。各カードからそのまま続行、またはターミナルで開けます。",
    "sidebar.newSession": "新規セッション",
    "newSession.eyebrow": "New Session",
    "newSession.title": "プロジェクト一覧から新規作成",
    "newSession.subtitle.mobile": "先にプロジェクトを選び、最初の prompt を入力してください。",
    "newSession.subtitle.desktop": "ここでプロジェクトフォルダを選び、最初の prompt を入力します。",
    "newSession.workspaceLabel": "プロジェクトフォルダ",
    "newSession.workspacePlaceholder": "/Users/you/codex/project",
    "newSession.initialPromptLabel": "最初の prompt",
    "newSession.initialPromptPlaceholder": "最初のメッセージを入力して新しい実行セッションを作成",
    "newSession.collapse": "閉じる",
    "newSession.createAndRun": "作成して実行",
    "newSession.creating": "作成中...",
    "project.sessionCount": "{count} 件のセッション",
    "project.noUpdates": "更新なし",
    "project.new": "新規",
    "session.unnamed": "無題のセッション",
    "session.projectUnknown": "不明なプロジェクト",
    "session.branch": "ブランチ {branch}",
    "session.actionMenu": "操作",
    "session.continue": "続行",
    "session.openTerminal": "ターミナルで開く",
    "session.rename": "名前変更",
    "session.moveUp": "上へ",
    "session.moveDown": "下へ",
    "session.delete": "削除",
    "workspace.empty": "このプロジェクトにはまだセッションがありません。",
    "workspace.noManaged": "管理対象セッションがまだありません。ここで先に作成できます。",
    "messages.emptySelect": "左側でセッションを選ぶか、プロジェクト一覧で新規作成してください。",
    "messages.emptyNoMessages": "このセッションにはまだ表示できるメッセージがありません。実行が始まると自動で表示されます。",
    "run.eyebrow": "Run Status",
    "run.idle": "現在アイドル",
    "run.cancel": "キャンセル",
    "run.expand": "展開",
    "run.collapse": "折りたたむ",
    "run.noInfo": "まだ表示すべき実行情報はありません。",
    "composer.label": "現在のセッションを続ける",
    "composer.placeholder": "このセッションを続ける。例: テストとロールバック手順も追加して",
    "composer.sending": "送信中...",
    "composer.submit": "現在のセッションへ送信",
    "current.eyebrow": "Current Session",
    "current.title": "現在のセッション",
    "current.selectHint": "左側でセッションを選ぶか、プロジェクト一覧で先に新規作成してください",
    "current.sessionId": "セッション ID",
    "current.repo": "リポジトリ",
    "current.branch": "ブランチ",
    "current.unrecognized": "未判定",
    "current.status": "現在の状態",
    "current.latestRun": "直近の実行",
    "current.noneYet": "まだありません",
    "current.latestPrompt": "直近の prompt",
    "current.noResumePrompt": "まだ継続指示は入力されていません",
    "current.verification": "実行判断",
    "conversation.eyebrow": "Conversation",
    "conversation.title": "履歴と続きの対話",
    "settings.eyebrow": "Settings",
    "settings.title": "設定",
    "settings.subtitle": "モデル名、思考強度、表示言語をここで選びます。新規作成と継続実行の両方でこの既定値を使います。",
    "settings.logout": "ログアウト",
    "settings.codexCli": "Codex CLI",
    "settings.notDetected": "未検出",
    "settings.notConfigured": "未設定",
    "settings.defaultModel": "デフォルトモデル",
    "settings.reasoning": "思考強度",
    "settings.language": "表示言語",
    "settings.terminalApp": "ターミナルアプリ",
    "settings.defaultExecution": "既定の Sandbox",
    "settings.defaultApproval": "既定の承認ポリシー",
    "settings.gitWriteEscalation": "Git 書き込み昇格",
    "settings.gitWritePermissions": "Git 昇格権限",
    "settings.followDefault": "既定に従う",
    "execution.eyebrow": "Execution",
    "execution.title.mobile": "デフォルトモデル、言語、権限",
    "execution.title.desktop": "デフォルトモデル、言語、ターミナル、権限",
    "settings.modelName": "モデル名",
    "settings.modelPlaceholder": "例: gpt-5.4",
    "settings.sandbox": "Sandbox 権限",
    "settings.approval": "承認ポリシー",
    "settings.allowGitWrite": "Git 書き込み昇格を許可",
    "settings.gitWriteHint.mobile": "git add、git commit、ブランチ書き換えなどを含む要求では、下の権限に自動で切り替えます。",
    "settings.gitWriteHint.desktop": "git add、git commit、ブランチ書き換えなどを含む要求では、下の権限に自動で切り替えます。\"ターミナルで開く\" でも使います。",
    "settings.gitWriteSandbox": "Git 書き込み Sandbox",
    "settings.gitWriteApproval": "Git 書き込み承認",
    "settings.scopeHint.mobile": "これらの設定は CodexApp の Web 実行入口にだけ適用され、メインの Codex 設定ファイルは変更しません。",
    "settings.scopeHint.desktop": "これらの設定は CodexApp の Web 実行と \"ターミナルで開く\" 入口にだけ適用され、メインの Codex 設定ファイルは変更しません。",
    "settings.saving": "保存中...",
    "settings.save": "設定を保存",
    "security.eyebrow": "Security",
    "security.title": "ログインパスワードを変更",
    "security.currentPassword": "現在のパスワード",
    "security.newPassword": "新しいパスワード",
    "security.confirmPassword": "新しいパスワードの確認",
    "security.clear": "クリア",
    "security.saving": "保存中...",
    "security.save": "パスワードを変更",
    "tabs.projects": "プロジェクト",
    "tabs.session": "セッション",
    "tabs.settings": "設定",
    "prompt.rename": "新しいセッション名を入力",
    "prompt.renameEmpty": "セッション名は空にできません",
    "prompt.renameFailed": "名前変更に失敗しました",
    "prompt.deleteConfirm": "セッション {name} を削除しますか？",
    "prompt.deleteFailed": "削除に失敗しました",
    "prompt.reorderFailed": "並び替えに失敗しました",
    "prompt.openTerminalFailed": "ターミナルで開けませんでした",
    "prompt.cancelFailed": "キャンセルに失敗しました",
    "prompt.submitFailed": "送信に失敗しました",
    "prompt.saveSettingsFailed": "設定の保存に失敗しました",
    "prompt.passwordUpdated": "パスワードを更新しました",
    "prompt.passwordChangeFailed": "パスワード変更に失敗しました",
    "prompt.continueFailed": "セッションの続行に失敗しました",
    "event.sessionConnected": "セッション接続済み",
    "event.threadCreated": "Codex スレッドを作成しました",
    "event.threadId": "Codex thread: {id}",
    "event.assistantResult": "アシスタントが結果を返しました",
    "event.turnCompleted": "この実行は完了しました",
    "event.outputTokens": "出力 tokens: {tokens}",
    "event.cliCompleted": "CLI が完了イベントを送信しました",
    "event.logError": "実行ログエラー",
    "event.cliLog": "CLI ログ",
    "highlight.currentStatus": "現在の状態",
    "highlight.finalReply": "最終返信",
    "highlight.failureReason": "失敗理由",
    "highlight.startedAt": " · 開始 {time}",
    "highlight.endedAt": " · 終了 {time}",
    "verification.noRuns": "実行履歴はまだありません",
    "verification.failed": "直近の実行は失敗しました",
    "verification.cancelled": "直近の実行はキャンセルされました",
    "verification.running": "実行中です",
    "verification.queued": "実行待ちです",
    "verification.hasResult": "結果があります。続けて進められます。",
    "verification.noSummary": "実行は終了しましたが最終要約はありません",
    "loading.message": "Loading Codex console…",
    "api.invalidJson": "レスポンスが有効な JSON ではありません",
    "api.requestFailed": "リクエスト失敗: {status}",
  },
  ko: {
    "meta.appTitle": "Codex CLI Web Console",
    "common.notSet": "설정 안 됨",
    "common.unknown": "알 수 없음",
    "common.none": "없음",
    "common.you": "나",
    "common.codexThread": "Codex 스레드",
    "common.defaultModel": "기본 모델",
    "time.justNow": "방금 전",
    "reasoning.low": "낮음",
    "reasoning.medium": "중간",
    "reasoning.high": "높음",
    "reasoning.xhigh": "매우 높음",
    "sandbox.read-only": "읽기 전용",
    "sandbox.workspace-write": "워크스페이스 쓰기 가능",
    "sandbox.danger-full-access": "전체 접근",
    "approval.untrusted": "비신뢰 명령만 승인",
    "approval.on-request": "요청 시",
    "approval.never": "안 함",
    "gitWrite.enabled": "사용",
    "gitWrite.disabled": "사용 안 함",
    "status.ready": "대기",
    "status.queued": "대기열",
    "status.running": "실행 중",
    "status.failed": "실패",
    "status.cancelled": "취소됨",
    "status.completed": "완료",
    "status.unknown": "알 수 없음",
    "sidebar.searchLabel": "세션 검색",
    "sidebar.searchPlaceholder": "제목, 경로, 브랜치, prompt 검색",
    "sidebar.filter.all": "전체",
    "sidebar.filter.active": "진행 중",
    "sidebar.filter.failed": "실패",
    "sidebar.filter.ready": "대기",
    "sidebar.countSummary": "{shown} / {total}개 세션 표시 중",
    "login.eyebrow": "Codex CLI Web Console",
    "login.title": "원격 세션 콘솔에 로그인",
    "login.subtitle": "프로젝트 목록, 현재 세션, 설정의 세 화면이 old 버전 흐름을 이어갑니다.",
    "login.username": "사용자 이름",
    "login.password": "비밀번호",
    "login.submit": "로그인",
    "login.failed": "로그인 실패",
    "sidebar.eyebrow": "Projects",
    "sidebar.title": "프로젝트 목록",
    "sidebar.summary.mobile": "관리되는 세션을 프로젝트별로 보여 줍니다. 모바일도 같은 백엔드 세션을 재사용합니다.",
    "sidebar.summary.desktop": "관리되는 세션을 프로젝트별로 보여 줍니다. 각 카드에서 바로 이어서 실행하거나 터미널로 열 수 있습니다.",
    "sidebar.newSession": "새 세션",
    "newSession.eyebrow": "New Session",
    "newSession.title": "프로젝트 목록에서 새로 만들기",
    "newSession.subtitle.mobile": "먼저 프로젝트를 고른 뒤 첫 prompt 를 입력하세요.",
    "newSession.subtitle.desktop": "여기서 프로젝트 폴더를 고르고 첫 prompt 를 입력합니다.",
    "newSession.workspaceLabel": "프로젝트 폴더",
    "newSession.workspacePlaceholder": "/Users/you/codex/project",
    "newSession.initialPromptLabel": "첫 prompt",
    "newSession.initialPromptPlaceholder": "첫 메시지를 입력해 새 실행 세션을 만드세요",
    "newSession.collapse": "접기",
    "newSession.createAndRun": "생성 후 실행",
    "newSession.creating": "생성 중...",
    "project.sessionCount": "{count}개 세션",
    "project.noUpdates": "업데이트 없음",
    "project.new": "새로 만들기",
    "session.unnamed": "이름 없는 세션",
    "session.projectUnknown": "알 수 없는 프로젝트",
    "session.branch": "브랜치 {branch}",
    "session.actionMenu": "작업",
    "session.continue": "이어서 실행",
    "session.openTerminal": "터미널로 열기",
    "session.rename": "이름 바꾸기",
    "session.moveUp": "위로",
    "session.moveDown": "아래로",
    "session.delete": "삭제",
    "workspace.empty": "이 프로젝트에는 아직 세션이 없습니다.",
    "workspace.noManaged": "관리되는 세션이 아직 없습니다. 여기서 먼저 만들 수 있습니다.",
    "messages.emptySelect": "왼쪽에서 세션을 선택하거나 프로젝트 목록에서 먼저 만드세요.",
    "messages.emptyNoMessages": "이 세션에는 아직 표시할 메시지가 없습니다. 실행이 시작되면 자동으로 나타납니다.",
    "run.eyebrow": "Run Status",
    "run.idle": "현재 대기 중",
    "run.cancel": "취소",
    "run.expand": "펼치기",
    "run.collapse": "접기",
    "run.noInfo": "아직 보여 줄 실행 정보가 없습니다.",
    "composer.label": "현재 세션 이어가기",
    "composer.placeholder": "이 세션을 이어가세요. 예: 테스트와 롤백 절차도 추가해 줘",
    "composer.sending": "전송 중...",
    "composer.submit": "현재 세션으로 보내기",
    "current.eyebrow": "Current Session",
    "current.title": "현재 세션",
    "current.selectHint": "왼쪽에서 세션을 선택하거나 프로젝트 목록에서 먼저 새로 만드세요",
    "current.sessionId": "세션 ID",
    "current.repo": "저장소",
    "current.branch": "브랜치",
    "current.unrecognized": "확인 불가",
    "current.status": "현재 상태",
    "current.latestRun": "최근 실행",
    "current.noneYet": "없음",
    "current.latestPrompt": "최근 prompt",
    "current.noResumePrompt": "아직 이어서 실행할 지시가 없습니다",
    "current.verification": "실행 판단",
    "conversation.eyebrow": "Conversation",
    "conversation.title": "대화 기록과 이어서 실행",
    "settings.eyebrow": "Settings",
    "settings.title": "설정",
    "settings.subtitle": "모델명, 추론 강도, 인터페이스 언어를 여기서 선택합니다. 새 실행과 이어서 실행 모두 이 기본값을 사용합니다.",
    "settings.logout": "로그아웃",
    "settings.codexCli": "Codex CLI",
    "settings.notDetected": "감지되지 않음",
    "settings.notConfigured": "구성 안 됨",
    "settings.defaultModel": "기본 모델",
    "settings.reasoning": "추론 강도",
    "settings.language": "인터페이스 언어",
    "settings.terminalApp": "터미널 앱",
    "settings.defaultExecution": "기본 Sandbox",
    "settings.defaultApproval": "기본 승인 정책",
    "settings.gitWriteEscalation": "Git 쓰기 승격",
    "settings.gitWritePermissions": "Git 승격 권한",
    "settings.followDefault": "기본값 따름",
    "execution.eyebrow": "Execution",
    "execution.title.mobile": "기본 모델, 언어, 권한",
    "execution.title.desktop": "기본 모델, 언어, 터미널, 권한",
    "settings.modelName": "모델 이름",
    "settings.modelPlaceholder": "예: gpt-5.4",
    "settings.sandbox": "Sandbox 권한",
    "settings.approval": "승인 정책",
    "settings.allowGitWrite": "Git 쓰기 승격 허용",
    "settings.gitWriteHint.mobile": "요청에 git add, git commit, 브랜치 재작성 등이 포함되면 아래 권한으로 자동 전환합니다.",
    "settings.gitWriteHint.desktop": "요청에 git add, git commit, 브랜치 재작성 등이 포함되면 아래 권한으로 자동 전환합니다. \"터미널로 열기\"도 이를 사용합니다.",
    "settings.gitWriteSandbox": "Git 쓰기 Sandbox",
    "settings.gitWriteApproval": "Git 쓰기 승인",
    "settings.scopeHint.mobile": "이 설정은 CodexApp 웹 실행 진입점에만 적용되며 기본 Codex 설정 파일은 바꾸지 않습니다.",
    "settings.scopeHint.desktop": "이 설정은 CodexApp 웹 실행과 \"터미널로 열기\" 진입점에만 적용되며 기본 Codex 설정 파일은 바꾸지 않습니다.",
    "settings.saving": "저장 중...",
    "settings.save": "설정 저장",
    "security.eyebrow": "Security",
    "security.title": "로그인 비밀번호 변경",
    "security.currentPassword": "현재 비밀번호",
    "security.newPassword": "새 비밀번호",
    "security.confirmPassword": "새 비밀번호 확인",
    "security.clear": "지우기",
    "security.saving": "저장 중...",
    "security.save": "비밀번호 변경",
    "tabs.projects": "프로젝트",
    "tabs.session": "세션",
    "tabs.settings": "설정",
    "prompt.rename": "새 세션 이름 입력",
    "prompt.renameEmpty": "세션 이름은 비워 둘 수 없습니다",
    "prompt.renameFailed": "이름 변경 실패",
    "prompt.deleteConfirm": "세션 {name} 을(를) 삭제할까요?",
    "prompt.deleteFailed": "삭제 실패",
    "prompt.reorderFailed": "순서 변경 실패",
    "prompt.openTerminalFailed": "터미널 열기 실패",
    "prompt.cancelFailed": "취소 실패",
    "prompt.submitFailed": "제출 실패",
    "prompt.saveSettingsFailed": "설정 저장 실패",
    "prompt.passwordUpdated": "비밀번호가 업데이트되었습니다",
    "prompt.passwordChangeFailed": "비밀번호 변경 실패",
    "prompt.continueFailed": "세션 이어가기 실패",
    "event.sessionConnected": "세션 연결됨",
    "event.threadCreated": "Codex 스레드가 생성되었습니다",
    "event.threadId": "Codex thread: {id}",
    "event.assistantResult": "어시스턴트가 결과를 생성했습니다",
    "event.turnCompleted": "이번 실행이 완료되었습니다",
    "event.outputTokens": "출력 tokens: {tokens}",
    "event.cliCompleted": "CLI 가 완료 이벤트를 보냈습니다",
    "event.logError": "실행 로그 오류",
    "event.cliLog": "CLI 로그",
    "highlight.currentStatus": "현재 상태",
    "highlight.finalReply": "최종 응답",
    "highlight.failureReason": "실패 원인",
    "highlight.startedAt": " · 시작 {time}",
    "highlight.endedAt": " · 종료 {time}",
    "verification.noRuns": "실행 기록이 없습니다",
    "verification.failed": "최근 실행이 실패했습니다",
    "verification.cancelled": "최근 실행이 취소되었습니다",
    "verification.running": "현재 실행 중입니다",
    "verification.queued": "실행 대기 중입니다",
    "verification.hasResult": "결과가 있습니다. 계속 진행할 수 있습니다.",
    "verification.noSummary": "실행은 끝났지만 최종 요약이 없습니다",
    "loading.message": "Loading Codex console…",
    "api.invalidJson": "응답이 올바른 JSON 이 아닙니다",
    "api.requestFailed": "요청 실패: {status}",
  },
  ar: {
    "meta.appTitle": "Codex CLI Web Console",
    "common.notSet": "غير مضبوط",
    "common.unknown": "غير معروف",
    "common.none": "لا يوجد",
    "common.you": "أنت",
    "common.codexThread": "سلسلة Codex",
    "common.defaultModel": "النموذج الافتراضي",
    "time.justNow": "الآن",
    "reasoning.low": "منخفض",
    "reasoning.medium": "متوسط",
    "reasoning.high": "عالٍ",
    "reasoning.xhigh": "عالٍ جدًا",
    "sandbox.read-only": "للقراءة فقط",
    "sandbox.workspace-write": "كتابة داخل مساحة العمل",
    "sandbox.danger-full-access": "وصول كامل",
    "approval.untrusted": "اعتماد الأوامر غير الموثوقة فقط",
    "approval.on-request": "عند الطلب",
    "approval.never": "أبدًا",
    "gitWrite.enabled": "مفعّل",
    "gitWrite.disabled": "غير مفعّل",
    "status.ready": "خامل",
    "status.queued": "في الانتظار",
    "status.running": "قيد التشغيل",
    "status.failed": "فشل",
    "status.cancelled": "أُلغي",
    "status.completed": "مكتمل",
    "status.unknown": "غير معروف",
    "sidebar.searchLabel": "ابحث في الجلسات",
    "sidebar.searchPlaceholder": "ابحث في العنوان أو المسار أو الفرع أو prompt",
    "sidebar.filter.all": "الكل",
    "sidebar.filter.active": "نشطة",
    "sidebar.filter.failed": "فاشلة",
    "sidebar.filter.ready": "خاملة",
    "sidebar.countSummary": "عرض {shown} من أصل {total} جلسة",
    "login.eyebrow": "Codex CLI Web Console",
    "login.title": "سجّل الدخول إلى وحدة الجلسات البعيدة",
    "login.subtitle": "قائمة المشاريع والجلسة الحالية والإعدادات تتبع نفس سير العمل القديم.",
    "login.username": "اسم المستخدم",
    "login.password": "كلمة المرور",
    "login.submit": "تسجيل الدخول",
    "login.failed": "فشل تسجيل الدخول",
    "sidebar.eyebrow": "Projects",
    "sidebar.title": "قائمة المشاريع",
    "sidebar.summary.mobile": "تُعرض الجلسات المُدارة حسب المشروع. تطبيق الهاتف يعيد استخدام نفس جلسات الخلفية.",
    "sidebar.summary.desktop": "تُعرض الجلسات المُدارة حسب المشروع. يمكن متابعة كل بطاقة مباشرة أو فتحها في الطرفية.",
    "sidebar.newSession": "جلسة جديدة",
    "newSession.eyebrow": "New Session",
    "newSession.title": "إنشاء من قائمة المشاريع",
    "newSession.subtitle.mobile": "اختر مشروعًا أولًا ثم أدخل أول prompt.",
    "newSession.subtitle.desktop": "اختر مجلد المشروع وأدخل أول prompt هنا.",
    "newSession.workspaceLabel": "مجلد المشروع",
    "newSession.workspacePlaceholder": "/Users/you/codex/project",
    "newSession.initialPromptLabel": "أول prompt",
    "newSession.initialPromptPlaceholder": "أدخل الرسالة الأولى لإنشاء جلسة تنفيذ جديدة",
    "newSession.collapse": "طي",
    "newSession.createAndRun": "إنشاء وتشغيل",
    "newSession.creating": "جارٍ الإنشاء...",
    "project.sessionCount": "{count} جلسة",
    "project.noUpdates": "لا توجد تحديثات",
    "project.new": "جديد",
    "session.unnamed": "جلسة بلا اسم",
    "session.projectUnknown": "مشروع غير معروف",
    "session.branch": "الفرع {branch}",
    "session.actionMenu": "إجراءات",
    "session.continue": "متابعة",
    "session.openTerminal": "فتح في الطرفية",
    "session.rename": "إعادة التسمية",
    "session.moveUp": "نقل لأعلى",
    "session.moveDown": "نقل لأسفل",
    "session.delete": "حذف",
    "workspace.empty": "لا توجد جلسات في هذا المشروع بعد.",
    "workspace.noManaged": "لا توجد جلسات مُدارة بعد. يمكنك إنشاء واحدة هنا أولًا.",
    "messages.emptySelect": "اختر جلسة من اليسار أو أنشئ واحدة من قائمة المشاريع أولًا.",
    "messages.emptyNoMessages": "لا توجد رسائل مرئية لهذه الجلسة بعد. ستظهر تلقائيًا بعد بدء التشغيل.",
    "run.eyebrow": "Run Status",
    "run.idle": "خامل الآن",
    "run.cancel": "إلغاء",
    "run.expand": "توسيع",
    "run.collapse": "طي",
    "run.noInfo": "لا توجد معلومات تشغيل تستحق العرض بعد.",
    "composer.label": "متابعة الجلسة الحالية",
    "composer.placeholder": "تابع هذه الجلسة، مثلًا: أضف الاختبارات وخطة التراجع أيضًا",
    "composer.sending": "جارٍ الإرسال...",
    "composer.submit": "إرسال إلى الجلسة الحالية",
    "current.eyebrow": "Current Session",
    "current.title": "الجلسة الحالية",
    "current.selectHint": "اختر جلسة من اليسار أو أنشئ واحدة أولًا من قائمة المشاريع",
    "current.sessionId": "معرّف الجلسة",
    "current.repo": "المستودع",
    "current.branch": "الفرع",
    "current.unrecognized": "غير معروف",
    "current.status": "الحالة الحالية",
    "current.latestRun": "آخر تشغيل",
    "current.noneYet": "لا يوجد بعد",
    "current.latestPrompt": "آخر prompt",
    "current.noResumePrompt": "لم يتم إدخال prompt متابعة بعد",
    "current.verification": "تقييم التنفيذ",
    "conversation.eyebrow": "Conversation",
    "conversation.title": "السجل والمتابعة",
    "settings.eyebrow": "Settings",
    "settings.title": "الإعدادات",
    "settings.subtitle": "اختر اسم النموذج ومستوى التفكير ولغة الواجهة هنا. تستخدم الجلسات الجديدة والمستمرة هذه القيم الافتراضية.",
    "settings.logout": "تسجيل الخروج",
    "settings.codexCli": "Codex CLI",
    "settings.notDetected": "غير مكتشف",
    "settings.notConfigured": "غير مضبوط",
    "settings.defaultModel": "النموذج الافتراضي",
    "settings.reasoning": "مستوى التفكير",
    "settings.language": "لغة الواجهة",
    "settings.terminalApp": "تطبيق الطرفية",
    "settings.defaultExecution": "Sandbox الافتراضي",
    "settings.defaultApproval": "سياسة الاعتماد الافتراضية",
    "settings.gitWriteEscalation": "ترقية صلاحيات Git للكتابة",
    "settings.gitWritePermissions": "صلاحيات ترقية Git",
    "settings.followDefault": "اتباع الافتراضي",
    "execution.eyebrow": "Execution",
    "execution.title.mobile": "النموذج واللغة والصلاحيات الافتراضية",
    "execution.title.desktop": "النموذج واللغة والطرفية والصلاحيات الافتراضية",
    "settings.modelName": "اسم النموذج",
    "settings.modelPlaceholder": "مثل gpt-5.4",
    "settings.sandbox": "صلاحيات Sandbox",
    "settings.approval": "سياسة الاعتماد",
    "settings.allowGitWrite": "السماح بترقية صلاحيات Git للكتابة",
    "settings.gitWriteHint.mobile": "عند وجود طلبات مثل git add أو git commit أو إعادة كتابة الفروع، يتم التبديل تلقائيًا إلى الصلاحيات التالية.",
    "settings.gitWriteHint.desktop": "عند وجود طلبات مثل git add أو git commit أو إعادة كتابة الفروع، يتم التبديل تلقائيًا إلى الصلاحيات التالية. ويستخدمها أيضًا \"الفتح في الطرفية\".",
    "settings.gitWriteSandbox": "Sandbox لكتابة Git",
    "settings.gitWriteApproval": "اعتماد كتابة Git",
    "settings.scopeHint.mobile": "هذه الإعدادات تؤثر فقط على نقطة التنفيذ عبر الويب في CodexApp ولا تعيد كتابة ملف إعدادات Codex الرئيسي.",
    "settings.scopeHint.desktop": "هذه الإعدادات تؤثر فقط على التنفيذ عبر الويب و\"الفتح في الطرفية\" في CodexApp ولا تعيد كتابة ملف إعدادات Codex الرئيسي.",
    "settings.saving": "جارٍ الحفظ...",
    "settings.save": "حفظ الإعدادات",
    "security.eyebrow": "Security",
    "security.title": "تغيير كلمة مرور الدخول",
    "security.currentPassword": "كلمة المرور الحالية",
    "security.newPassword": "كلمة المرور الجديدة",
    "security.confirmPassword": "تأكيد كلمة المرور الجديدة",
    "security.clear": "مسح",
    "security.saving": "جارٍ الحفظ...",
    "security.save": "تغيير كلمة المرور",
    "tabs.projects": "المشاريع",
    "tabs.session": "الجلسة",
    "tabs.settings": "الإعدادات",
    "prompt.rename": "أدخل اسمًا جديدًا للجلسة",
    "prompt.renameEmpty": "لا يمكن أن يكون اسم الجلسة فارغًا",
    "prompt.renameFailed": "فشلت إعادة التسمية",
    "prompt.deleteConfirm": "هل تريد حذف الجلسة {name}؟",
    "prompt.deleteFailed": "فشل الحذف",
    "prompt.reorderFailed": "فشل إعادة الترتيب",
    "prompt.openTerminalFailed": "فشل الفتح في الطرفية",
    "prompt.cancelFailed": "فشل الإلغاء",
    "prompt.submitFailed": "فشل الإرسال",
    "prompt.saveSettingsFailed": "فشل حفظ الإعدادات",
    "prompt.passwordUpdated": "تم تحديث كلمة المرور",
    "prompt.passwordChangeFailed": "فشل تغيير كلمة المرور",
    "prompt.continueFailed": "فشلت متابعة الجلسة",
    "event.sessionConnected": "تم الاتصال بالجلسة",
    "event.threadCreated": "تم إنشاء سلسلة Codex",
    "event.threadId": "Codex thread: {id}",
    "event.assistantResult": "أنتج المساعد نتيجة",
    "event.turnCompleted": "اكتمل هذا التشغيل",
    "event.outputTokens": "رموز الإخراج: {tokens}",
    "event.cliCompleted": "أرسل CLI حدث الاكتمال",
    "event.logError": "خطأ في سجل التشغيل",
    "event.cliLog": "سجل CLI",
    "highlight.currentStatus": "الحالة الحالية",
    "highlight.finalReply": "الرد النهائي",
    "highlight.failureReason": "سبب الفشل",
    "highlight.startedAt": " · بدأ {time}",
    "highlight.endedAt": " · انتهى {time}",
    "verification.noRuns": "لا توجد عمليات تشغيل بعد",
    "verification.failed": "فشل آخر تشغيل",
    "verification.cancelled": "تم إلغاء آخر تشغيل",
    "verification.running": "قيد التشغيل الآن",
    "verification.queued": "بانتظار التشغيل",
    "verification.hasResult": "النتيجة متاحة ويمكنك المتابعة.",
    "verification.noSummary": "انتهى التشغيل بدون ملخص نهائي",
    "loading.message": "Loading Codex console…",
    "api.invalidJson": "الاستجابة ليست JSON صالحًا",
    "api.requestFailed": "فشل الطلب: {status}",
  },
  ru: {
    "meta.appTitle": "Codex CLI Web Console",
    "common.notSet": "Не задано",
    "common.unknown": "Неизвестно",
    "common.none": "Нет",
    "common.you": "Вы",
    "common.codexThread": "Поток Codex",
    "common.defaultModel": "Модель по умолчанию",
    "time.justNow": "только что",
    "reasoning.low": "Низкий",
    "reasoning.medium": "Средний",
    "reasoning.high": "Высокий",
    "reasoning.xhigh": "Очень высокий",
    "sandbox.read-only": "Только чтение",
    "sandbox.workspace-write": "Запись в рабочую область",
    "sandbox.danger-full-access": "Полный доступ",
    "approval.untrusted": "Только для недоверенных команд",
    "approval.on-request": "По запросу",
    "approval.never": "Никогда",
    "gitWrite.enabled": "Включено",
    "gitWrite.disabled": "Выключено",
    "status.ready": "Ожидание",
    "status.queued": "В очереди",
    "status.running": "Выполняется",
    "status.failed": "Ошибка",
    "status.cancelled": "Отменено",
    "status.completed": "Завершено",
    "status.unknown": "Неизвестно",
    "sidebar.searchLabel": "Поиск сессий",
    "sidebar.searchPlaceholder": "Искать по заголовку, пути, ветке, prompt",
    "sidebar.filter.all": "Все",
    "sidebar.filter.active": "Активные",
    "sidebar.filter.failed": "С ошибкой",
    "sidebar.filter.ready": "Ожидание",
    "sidebar.countSummary": "Показано {shown} из {total} сессий",
    "login.eyebrow": "Codex CLI Web Console",
    "login.title": "Войдите в консоль удалённых сессий",
    "login.subtitle": "Список проектов, текущая сессия и настройки повторяют старый рабочий поток.",
    "login.username": "Имя пользователя",
    "login.password": "Пароль",
    "login.submit": "Войти",
    "login.failed": "Не удалось войти",
    "sidebar.eyebrow": "Projects",
    "sidebar.title": "Список проектов",
    "sidebar.summary.mobile": "Управляемые сессии сгруппированы по проектам. Мобильный клиент использует те же backend-сессии.",
    "sidebar.summary.desktop": "Управляемые сессии сгруппированы по проектам. Каждую карточку можно сразу продолжить или открыть в терминале.",
    "sidebar.newSession": "Новая сессия",
    "newSession.eyebrow": "New Session",
    "newSession.title": "Создать из списка проектов",
    "newSession.subtitle.mobile": "Сначала выберите проект, затем введите первый prompt.",
    "newSession.subtitle.desktop": "Здесь выберите папку проекта и введите первый prompt.",
    "newSession.workspaceLabel": "Папка проекта",
    "newSession.workspacePlaceholder": "/Users/you/codex/project",
    "newSession.initialPromptLabel": "Первый prompt",
    "newSession.initialPromptPlaceholder": "Введите первое сообщение, чтобы создать новую сессию выполнения",
    "newSession.collapse": "Свернуть",
    "newSession.createAndRun": "Создать и запустить",
    "newSession.creating": "Создание...",
    "project.sessionCount": "{count} сессий",
    "project.noUpdates": "Нет обновлений",
    "project.new": "Новая",
    "session.unnamed": "Сессия без названия",
    "session.projectUnknown": "Неизвестный проект",
    "session.branch": "Ветка {branch}",
    "session.actionMenu": "Действия",
    "session.continue": "Продолжить",
    "session.openTerminal": "Открыть в терминале",
    "session.rename": "Переименовать",
    "session.moveUp": "Вверх",
    "session.moveDown": "Вниз",
    "session.delete": "Удалить",
    "workspace.empty": "В этом проекте пока нет сессий.",
    "workspace.noManaged": "Пока нет управляемых сессий. Сначала можно создать одну здесь.",
    "messages.emptySelect": "Выберите сессию слева или сначала создайте её в списке проектов.",
    "messages.emptyNoMessages": "В этой сессии пока нет видимых сообщений. Они появятся после запуска.",
    "run.eyebrow": "Run Status",
    "run.idle": "Сейчас простаивает",
    "run.cancel": "Отменить",
    "run.expand": "Развернуть",
    "run.collapse": "Свернуть",
    "run.noInfo": "Пока нет информации о запуске, которую стоило бы показывать.",
    "composer.label": "Продолжить текущую сессию",
    "composer.placeholder": "Продолжите эту сессию, например: добавь тесты и план отката",
    "composer.sending": "Отправка...",
    "composer.submit": "Отправить в текущую сессию",
    "current.eyebrow": "Current Session",
    "current.title": "Текущая сессия",
    "current.selectHint": "Выберите сессию слева или сначала создайте её в списке проектов",
    "current.sessionId": "ID сессии",
    "current.repo": "Репозиторий",
    "current.branch": "Ветка",
    "current.unrecognized": "Не определено",
    "current.status": "Текущий статус",
    "current.latestRun": "Последний запуск",
    "current.noneYet": "Пока нет",
    "current.latestPrompt": "Последний prompt",
    "current.noResumePrompt": "Команда продолжения ещё не вводилась",
    "current.verification": "Оценка выполнения",
    "conversation.eyebrow": "Conversation",
    "conversation.title": "История и продолжение",
    "settings.eyebrow": "Settings",
    "settings.title": "Настройки",
    "settings.subtitle": "Здесь выбираются модель, уровень рассуждения и язык интерфейса. Новые и продолженные запуски используют эти значения по умолчанию.",
    "settings.logout": "Выйти",
    "settings.codexCli": "Codex CLI",
    "settings.notDetected": "Не обнаружен",
    "settings.notConfigured": "Не настроено",
    "settings.defaultModel": "Модель по умолчанию",
    "settings.reasoning": "Уровень рассуждения",
    "settings.language": "Язык интерфейса",
    "settings.terminalApp": "Терминал",
    "settings.defaultExecution": "Sandbox по умолчанию",
    "settings.defaultApproval": "Политика подтверждения по умолчанию",
    "settings.gitWriteEscalation": "Повышение прав для Git-записи",
    "settings.gitWritePermissions": "Права повышения для Git",
    "settings.followDefault": "Следовать умолчанию",
    "execution.eyebrow": "Execution",
    "execution.title.mobile": "Модель, язык и права по умолчанию",
    "execution.title.desktop": "Модель, язык, терминал и права по умолчанию",
    "settings.modelName": "Название модели",
    "settings.modelPlaceholder": "например gpt-5.4",
    "settings.sandbox": "Права Sandbox",
    "settings.approval": "Политика подтверждения",
    "settings.allowGitWrite": "Разрешить повышение прав для Git-записи",
    "settings.gitWriteHint.mobile": "Если запрос включает git add, git commit или переписывание веток, автоматически переключаться на права ниже.",
    "settings.gitWriteHint.desktop": "Если запрос включает git add, git commit или переписывание веток, автоматически переключаться на права ниже. Их же использует \"Открыть в терминале\".",
    "settings.gitWriteSandbox": "Sandbox для Git-записи",
    "settings.gitWriteApproval": "Подтверждение для Git-записи",
    "settings.scopeHint.mobile": "Эти настройки влияют только на web-вход выполнения CodexApp и не переписывают ваш основной конфиг Codex.",
    "settings.scopeHint.desktop": "Эти настройки влияют только на web-вход выполнения и \"Открыть в терминале\" в CodexApp и не переписывают ваш основной конфиг Codex.",
    "settings.saving": "Сохранение...",
    "settings.save": "Сохранить настройки",
    "security.eyebrow": "Security",
    "security.title": "Изменить пароль входа",
    "security.currentPassword": "Текущий пароль",
    "security.newPassword": "Новый пароль",
    "security.confirmPassword": "Подтвердите новый пароль",
    "security.clear": "Очистить",
    "security.saving": "Сохранение...",
    "security.save": "Изменить пароль",
    "tabs.projects": "Проекты",
    "tabs.session": "Сессия",
    "tabs.settings": "Настройки",
    "prompt.rename": "Введите новое имя сессии",
    "prompt.renameEmpty": "Имя сессии не может быть пустым",
    "prompt.renameFailed": "Не удалось переименовать",
    "prompt.deleteConfirm": "Удалить сессию {name}?",
    "prompt.deleteFailed": "Не удалось удалить",
    "prompt.reorderFailed": "Не удалось изменить порядок",
    "prompt.openTerminalFailed": "Не удалось открыть в терминале",
    "prompt.cancelFailed": "Не удалось отменить",
    "prompt.submitFailed": "Не удалось отправить",
    "prompt.saveSettingsFailed": "Не удалось сохранить настройки",
    "prompt.passwordUpdated": "Пароль обновлён",
    "prompt.passwordChangeFailed": "Не удалось изменить пароль",
    "prompt.continueFailed": "Не удалось продолжить сессию",
    "event.sessionConnected": "Сессия подключена",
    "event.threadCreated": "Поток Codex создан",
    "event.threadId": "Codex thread: {id}",
    "event.assistantResult": "Ассистент выдал результат",
    "event.turnCompleted": "Этот запуск завершён",
    "event.outputTokens": "Выходные tokens: {tokens}",
    "event.cliCompleted": "CLI отправил событие завершения",
    "event.logError": "Ошибка лога запуска",
    "event.cliLog": "Лог CLI",
    "highlight.currentStatus": "Текущий статус",
    "highlight.finalReply": "Финальный ответ",
    "highlight.failureReason": "Причина ошибки",
    "highlight.startedAt": " · старт {time}",
    "highlight.endedAt": " · конец {time}",
    "verification.noRuns": "Запусков пока нет",
    "verification.failed": "Последний запуск завершился ошибкой",
    "verification.cancelled": "Последний запуск был отменён",
    "verification.running": "Сейчас выполняется",
    "verification.queued": "Ожидает запуска",
    "verification.hasResult": "Результат уже есть, можно продолжать.",
    "verification.noSummary": "Запуск завершился без финального резюме",
    "loading.message": "Loading Codex console…",
    "api.invalidJson": "Ответ не является корректным JSON",
    "api.requestFailed": "Ошибка запроса: {status}",
  },
  th: {
    "meta.appTitle": "Codex CLI Web Console",
    "common.notSet": "ยังไม่ได้ตั้งค่า",
    "common.unknown": "ไม่ทราบ",
    "common.none": "ไม่มี",
    "common.you": "คุณ",
    "common.codexThread": "เธรด Codex",
    "common.defaultModel": "โมเดลเริ่มต้น",
    "time.justNow": "เมื่อกี้นี้",
    "reasoning.low": "ต่ำ",
    "reasoning.medium": "กลาง",
    "reasoning.high": "สูง",
    "reasoning.xhigh": "สูงมาก",
    "sandbox.read-only": "อ่านอย่างเดียว",
    "sandbox.workspace-write": "เขียนใน workspace ได้",
    "sandbox.danger-full-access": "เข้าถึงทั้งหมด",
    "approval.untrusted": "อนุมัติเฉพาะคำสั่งที่ไม่เชื่อถือ",
    "approval.on-request": "ตามคำขอ",
    "approval.never": "ไม่ต้องอนุมัติ",
    "gitWrite.enabled": "เปิดอยู่",
    "gitWrite.disabled": "ปิดอยู่",
    "status.ready": "ว่าง",
    "status.queued": "รอคิว",
    "status.running": "กำลังทำงาน",
    "status.failed": "ล้มเหลว",
    "status.cancelled": "ยกเลิกแล้ว",
    "status.completed": "เสร็จแล้ว",
    "status.unknown": "ไม่ทราบ",
    "sidebar.searchLabel": "ค้นหาเซสชัน",
    "sidebar.searchPlaceholder": "ค้นหาจากชื่อ เส้นทาง branch หรือ prompt",
    "sidebar.filter.all": "ทั้งหมด",
    "sidebar.filter.active": "กำลังทำงาน",
    "sidebar.filter.failed": "ล้มเหลว",
    "sidebar.filter.ready": "ว่าง",
    "sidebar.countSummary": "แสดง {shown} / {total} เซสชัน",
    "login.eyebrow": "Codex CLI Web Console",
    "login.title": "เข้าสู่ระบบคอนโซลเซสชันระยะไกล",
    "login.subtitle": "หน้ารายการโปรเจกต์ เซสชันปัจจุบัน และการตั้งค่า ใช้รูปแบบการทำงานแบบเดิม",
    "login.username": "ชื่อผู้ใช้",
    "login.password": "รหัสผ่าน",
    "login.submit": "เข้าสู่ระบบ",
    "login.failed": "เข้าสู่ระบบไม่สำเร็จ",
    "sidebar.eyebrow": "Projects",
    "sidebar.title": "รายการโปรเจกต์",
    "sidebar.summary.mobile": "แสดงเซสชันที่จัดการไว้ตามโปรเจกต์ มือถือใช้ backend sessions ชุดเดียวกัน",
    "sidebar.summary.desktop": "แสดงเซสชันที่จัดการไว้ตามโปรเจกต์ แต่ละการ์ดสั่งทำต่อหรือเปิดในเทอร์มินัลได้ทันที",
    "sidebar.newSession": "เซสชันใหม่",
    "newSession.eyebrow": "New Session",
    "newSession.title": "สร้างจากรายการโปรเจกต์",
    "newSession.subtitle.mobile": "เลือกโปรเจกต์ก่อน แล้วค่อยกรอก prompt แรก",
    "newSession.subtitle.desktop": "เลือกโฟลเดอร์โปรเจกต์และกรอก prompt แรกที่นี่",
    "newSession.workspaceLabel": "โฟลเดอร์โปรเจกต์",
    "newSession.workspacePlaceholder": "/Users/you/codex/project",
    "newSession.initialPromptLabel": "prompt แรก",
    "newSession.initialPromptPlaceholder": "พิมพ์ข้อความแรกเพื่อสร้างเซสชันใหม่",
    "newSession.collapse": "ยุบ",
    "newSession.createAndRun": "สร้างและรัน",
    "newSession.creating": "กำลังสร้าง...",
    "project.sessionCount": "{count} เซสชัน",
    "project.noUpdates": "ยังไม่มีอัปเดต",
    "project.new": "สร้างใหม่",
    "session.unnamed": "เซสชันไม่มีชื่อ",
    "session.projectUnknown": "ไม่ทราบโปรเจกต์",
    "session.branch": "สาขา {branch}",
    "session.actionMenu": "การทำงาน",
    "session.continue": "ทำต่อ",
    "session.openTerminal": "เปิดในเทอร์มินัล",
    "session.rename": "เปลี่ยนชื่อ",
    "session.moveUp": "ย้ายขึ้น",
    "session.moveDown": "ย้ายลง",
    "session.delete": "ลบ",
    "workspace.empty": "โปรเจกต์นี้ยังไม่มีเซสชัน",
    "workspace.noManaged": "ยังไม่มีเซสชันที่จัดการไว้ เริ่มสร้างได้ที่นี่",
    "messages.emptySelect": "เลือกเซสชันทางซ้าย หรือสร้างใหม่จากรายการโปรเจกต์ก่อน",
    "messages.emptyNoMessages": "เซสชันนี้ยังไม่มีข้อความที่แสดงได้ ข้อความจะขึ้นอัตโนมัติหลังเริ่มรัน",
    "run.eyebrow": "Run Status",
    "run.idle": "ตอนนี้ว่าง",
    "run.cancel": "ยกเลิก",
    "run.expand": "ขยาย",
    "run.collapse": "ยุบ",
    "run.noInfo": "ยังไม่มีข้อมูลการรันที่ควรแสดง",
    "composer.label": "ทำต่อในเซสชันปัจจุบัน",
    "composer.placeholder": "ทำต่อในเซสชันนี้ เช่น เพิ่มเทสต์และแผน rollback ด้วย",
    "composer.sending": "กำลังส่ง...",
    "composer.submit": "ส่งไปยังเซสชันปัจจุบัน",
    "current.eyebrow": "Current Session",
    "current.title": "เซสชันปัจจุบัน",
    "current.selectHint": "เลือกเซสชันทางซ้าย หรือสร้างใหม่จากรายการโปรเจกต์ก่อน",
    "current.sessionId": "Session ID",
    "current.repo": "รีโป",
    "current.branch": "สาขา",
    "current.unrecognized": "ตรวจไม่พบ",
    "current.status": "สถานะปัจจุบัน",
    "current.latestRun": "การรันล่าสุด",
    "current.noneYet": "ยังไม่มี",
    "current.latestPrompt": "prompt ล่าสุด",
    "current.noResumePrompt": "ยังไม่มีคำสั่งให้ทำต่อ",
    "current.verification": "การประเมินการรัน",
    "conversation.eyebrow": "Conversation",
    "conversation.title": "ประวัติและทำต่อ",
    "settings.eyebrow": "Settings",
    "settings.title": "การตั้งค่า",
    "settings.subtitle": "เลือกชื่อโมเดล ระดับการคิด และภาษาหน้าอินเทอร์เฟซที่นี่ การสร้างใหม่และการทำต่อจะใช้ค่าเริ่มต้นชุดนี้",
    "settings.logout": "ออกจากระบบ",
    "settings.codexCli": "Codex CLI",
    "settings.notDetected": "ไม่พบ",
    "settings.notConfigured": "ยังไม่ได้ตั้งค่า",
    "settings.defaultModel": "โมเดลเริ่มต้น",
    "settings.reasoning": "ระดับการคิด",
    "settings.language": "ภาษาหน้าอินเทอร์เฟซ",
    "settings.terminalApp": "แอปเทอร์มินัล",
    "settings.defaultExecution": "Sandbox เริ่มต้น",
    "settings.defaultApproval": "นโยบายอนุมัติเริ่มต้น",
    "settings.gitWriteEscalation": "ยกระดับสิทธิ์สำหรับ Git write",
    "settings.gitWritePermissions": "สิทธิ์ยกระดับของ Git",
    "settings.followDefault": "ใช้ค่าเริ่มต้น",
    "execution.eyebrow": "Execution",
    "execution.title.mobile": "โมเดล ภาษา และสิทธิ์เริ่มต้น",
    "execution.title.desktop": "โมเดล ภาษา เทอร์มินัล และสิทธิ์เริ่มต้น",
    "settings.modelName": "ชื่อโมเดล",
    "settings.modelPlaceholder": "เช่น gpt-5.4",
    "settings.sandbox": "สิทธิ์ Sandbox",
    "settings.approval": "นโยบายอนุมัติ",
    "settings.allowGitWrite": "อนุญาตยกระดับสิทธิ์สำหรับ Git write",
    "settings.gitWriteHint.mobile": "เมื่อคำขอมี git add, git commit หรือการเขียนทับ branch จะสลับไปใช้สิทธิ์ด้านล่างอัตโนมัติ",
    "settings.gitWriteHint.desktop": "เมื่อคำขอมี git add, git commit หรือการเขียนทับ branch จะสลับไปใช้สิทธิ์ด้านล่างอัตโนมัติ และ \"เปิดในเทอร์มินัล\" ก็ใช้ชุดนี้ด้วย",
    "settings.gitWriteSandbox": "Sandbox สำหรับ Git write",
    "settings.gitWriteApproval": "การอนุมัติสำหรับ Git write",
    "settings.scopeHint.mobile": "การตั้งค่านี้มีผลเฉพาะทางเข้าเว็บของ CodexApp และจะไม่แก้ไฟล์ config หลักของ Codex",
    "settings.scopeHint.desktop": "การตั้งค่านี้มีผลเฉพาะทางเข้าเว็บและ \"เปิดในเทอร์มินัล\" ของ CodexApp และจะไม่แก้ไฟล์ config หลักของ Codex",
    "settings.saving": "กำลังบันทึก...",
    "settings.save": "บันทึกการตั้งค่า",
    "security.eyebrow": "Security",
    "security.title": "เปลี่ยนรหัสผ่านเข้าสู่ระบบ",
    "security.currentPassword": "รหัสผ่านปัจจุบัน",
    "security.newPassword": "รหัสผ่านใหม่",
    "security.confirmPassword": "ยืนยันรหัสผ่านใหม่",
    "security.clear": "ล้าง",
    "security.saving": "กำลังบันทึก...",
    "security.save": "เปลี่ยนรหัสผ่าน",
    "tabs.projects": "โปรเจกต์",
    "tabs.session": "เซสชัน",
    "tabs.settings": "การตั้งค่า",
    "prompt.rename": "ใส่ชื่อเซสชันใหม่",
    "prompt.renameEmpty": "ชื่อเซสชันต้องไม่ว่าง",
    "prompt.renameFailed": "เปลี่ยนชื่อไม่สำเร็จ",
    "prompt.deleteConfirm": "ลบเซสชัน {name} หรือไม่?",
    "prompt.deleteFailed": "ลบไม่สำเร็จ",
    "prompt.reorderFailed": "จัดลำดับไม่สำเร็จ",
    "prompt.openTerminalFailed": "เปิดเทอร์มินัลไม่สำเร็จ",
    "prompt.cancelFailed": "ยกเลิกไม่สำเร็จ",
    "prompt.submitFailed": "ส่งไม่สำเร็จ",
    "prompt.saveSettingsFailed": "บันทึกการตั้งค่าไม่สำเร็จ",
    "prompt.passwordUpdated": "อัปเดตรหัสผ่านแล้ว",
    "prompt.passwordChangeFailed": "เปลี่ยนรหัสผ่านไม่สำเร็จ",
    "prompt.continueFailed": "ทำต่อในเซสชันไม่สำเร็จ",
    "event.sessionConnected": "เชื่อมต่อเซสชันแล้ว",
    "event.threadCreated": "สร้างเธรด Codex แล้ว",
    "event.threadId": "Codex thread: {id}",
    "event.assistantResult": "ผู้ช่วยสร้างผลลัพธ์แล้ว",
    "event.turnCompleted": "รอบการทำงานนี้เสร็จแล้ว",
    "event.outputTokens": "โทเค็นผลลัพธ์: {tokens}",
    "event.cliCompleted": "CLI ส่งเหตุการณ์เสร็จสิ้นแล้ว",
    "event.logError": "ล็อกรันมีข้อผิดพลาด",
    "event.cliLog": "ล็อก CLI",
    "highlight.currentStatus": "สถานะปัจจุบัน",
    "highlight.finalReply": "คำตอบสุดท้าย",
    "highlight.failureReason": "สาเหตุที่ล้มเหลว",
    "highlight.startedAt": " · เริ่ม {time}",
    "highlight.endedAt": " · จบ {time}",
    "verification.noRuns": "ยังไม่มีประวัติการรัน",
    "verification.failed": "การรันล่าสุดล้มเหลว",
    "verification.cancelled": "การรันล่าสุดถูกยกเลิก",
    "verification.running": "กำลังทำงานอยู่",
    "verification.queued": "กำลังรอรัน",
    "verification.hasResult": "มีผลลัพธ์แล้ว และทำต่อได้",
    "verification.noSummary": "การรันจบแล้ว แต่ไม่มีสรุปสุดท้าย",
    "loading.message": "Loading Codex console…",
    "api.invalidJson": "คำตอบไม่ใช่ JSON ที่ถูกต้อง",
    "api.requestFailed": "คำขอล้มเหลว: {status}",
  },
};

const I18N_PATCH = {
  "zh-CN": {
    "sidebar.filter.pinned": "置顶",
    "sidebar.live": "实时同步",
    "sidebar.reconnecting": "正在重连",
    "sidebar.polling": "轮询保底",
    "sidebar.offline": "网络离线",
    "session.pin": "置顶",
    "session.unpin": "取消置顶",
    "session.pinned": "已置顶",
    "session.more": "更多",
    "session.quickContinue": "继续",
    "current.sync": "同步状态",
    "current.lastReply": "最近回复",
    "current.noReply": "暂无最终回复",
    "prompt.pinFailed": "置顶失败",
    "tabs.inbox": "会话",
    "mobile.back": "返回",
    "mobile.openSettings": "设置",
    "mobile.sessionListTitle": "会话",
    "mobile.sessionListSubtitle": "只保留最需要继续推进的线程。",
    "mobile.detailMeta": "{project} · {time}",
    "mobile.emptyDetail": "先从列表里选一个会话。",
    "mobile.status.running": "正在执行，稍后会自动回填结果。",
    "mobile.status.failed": "上一轮失败了，可以直接补一句继续推进。",
    "mobile.status.queued": "已进入队列，保持当前页面即可。",
    "mobile.status.ready": "当前空闲，可以继续发消息。",
  },
  "zh-TW": {
    "sidebar.filter.pinned": "置頂",
    "sidebar.live": "即時同步",
    "sidebar.reconnecting": "重新連線中",
    "sidebar.polling": "輪詢備援",
    "sidebar.offline": "網路離線",
    "session.pin": "置頂",
    "session.unpin": "取消置頂",
    "session.pinned": "已置頂",
    "session.more": "更多",
    "session.quickContinue": "繼續",
    "current.sync": "同步狀態",
    "current.lastReply": "最近回覆",
    "current.noReply": "暫無最終回覆",
    "prompt.pinFailed": "置頂失敗",
    "tabs.inbox": "會話",
    "mobile.back": "返回",
    "mobile.openSettings": "設定",
    "mobile.sessionListTitle": "會話",
    "mobile.sessionListSubtitle": "只保留最需要繼續推進的執行緒。",
    "mobile.detailMeta": "{project} · {time}",
    "mobile.emptyDetail": "先從列表選一個會話。",
    "mobile.status.running": "正在執行，稍後會自動補上結果。",
    "mobile.status.failed": "上一輪失敗了，可以直接補一句繼續推進。",
    "mobile.status.queued": "已進入佇列，保持目前頁面即可。",
    "mobile.status.ready": "目前空閒，可以繼續傳送訊息。",
  },
  en: {
    "sidebar.filter.pinned": "Pinned",
    "sidebar.live": "Live",
    "sidebar.reconnecting": "Reconnecting",
    "sidebar.polling": "Polling backup",
    "sidebar.offline": "Offline",
    "session.pin": "Pin",
    "session.unpin": "Unpin",
    "session.pinned": "Pinned",
    "session.more": "More",
    "session.quickContinue": "Continue",
    "current.sync": "Sync",
    "current.lastReply": "Last Reply",
    "current.noReply": "No final reply yet",
    "prompt.pinFailed": "Failed to update pin",
    "tabs.inbox": "Inbox",
    "mobile.back": "Back",
    "mobile.openSettings": "Settings",
    "mobile.sessionListTitle": "Sessions",
    "mobile.sessionListSubtitle": "Keep only the threads you actually need to move forward.",
    "mobile.detailMeta": "{project} · {time}",
    "mobile.emptyDetail": "Pick a session from the list first.",
    "mobile.status.running": "Running now. Results will sync back automatically.",
    "mobile.status.failed": "The last turn failed. You can continue directly from here.",
    "mobile.status.queued": "Queued now. Stay on this screen and it will update.",
    "mobile.status.ready": "Idle now. Send the next message when ready.",
  },
  ja: {
    "sidebar.filter.pinned": "ピン留め",
    "sidebar.live": "リアルタイム同期",
    "sidebar.reconnecting": "再接続中",
    "sidebar.polling": "ポーリング待機",
    "sidebar.offline": "オフライン",
    "session.pin": "ピン留め",
    "session.unpin": "ピンを外す",
    "session.pinned": "ピン留め済み",
    "session.more": "その他",
    "session.quickContinue": "続ける",
    "current.sync": "同期状態",
    "current.lastReply": "最新の返信",
    "current.noReply": "最終返信はまだありません",
    "prompt.pinFailed": "ピン留めの更新に失敗しました",
    "tabs.inbox": "セッション",
    "mobile.back": "戻る",
    "mobile.openSettings": "設定",
    "mobile.sessionListTitle": "セッション",
    "mobile.sessionListSubtitle": "今進める必要があるスレッドだけを残します。",
    "mobile.detailMeta": "{project} · {time}",
    "mobile.emptyDetail": "まず一覧からセッションを選んでください。",
    "mobile.status.running": "実行中です。結果は自動で反映されます。",
    "mobile.status.failed": "前回は失敗しました。ここからそのまま続けられます。",
    "mobile.status.queued": "キューに入りました。この画面のままで更新されます。",
    "mobile.status.ready": "現在は待機中です。準備ができたら次のメッセージを送れます。",
  },
  ko: {
    "sidebar.filter.pinned": "고정",
    "sidebar.live": "실시간 동기화",
    "sidebar.reconnecting": "재연결 중",
    "sidebar.polling": "폴링 백업",
    "sidebar.offline": "오프라인",
    "session.pin": "고정",
    "session.unpin": "고정 해제",
    "session.pinned": "고정됨",
    "session.more": "더보기",
    "session.quickContinue": "계속",
    "current.sync": "동기화 상태",
    "current.lastReply": "최근 답변",
    "current.noReply": "최종 답변이 아직 없습니다",
    "prompt.pinFailed": "고정 상태를 업데이트하지 못했습니다",
    "tabs.inbox": "세션",
    "mobile.back": "뒤로",
    "mobile.openSettings": "설정",
    "mobile.sessionListTitle": "세션",
    "mobile.sessionListSubtitle": "지금 실제로 이어서 진행할 스레드만 남깁니다.",
    "mobile.detailMeta": "{project} · {time}",
    "mobile.emptyDetail": "먼저 목록에서 세션을 선택해 주세요.",
    "mobile.status.running": "실행 중입니다. 결과는 자동으로 다시 동기화됩니다.",
    "mobile.status.failed": "직전 턴이 실패했습니다. 여기서 바로 이어서 진행할 수 있습니다.",
    "mobile.status.queued": "대기열에 들어갔습니다. 이 화면에서 업데이트됩니다.",
    "mobile.status.ready": "현재 유휴 상태입니다. 준비되면 다음 메시지를 보내세요.",
  },
  ar: {
    "sidebar.filter.pinned": "مثبتة",
    "sidebar.live": "مزامنة فورية",
    "sidebar.reconnecting": "جارٍ إعادة الاتصال",
    "sidebar.polling": "استطلاع احتياطي",
    "sidebar.offline": "غير متصل",
    "session.pin": "تثبيت",
    "session.unpin": "إلغاء التثبيت",
    "session.pinned": "مثبتة",
    "session.more": "المزيد",
    "session.quickContinue": "متابعة",
    "current.sync": "حالة المزامنة",
    "current.lastReply": "آخر رد",
    "current.noReply": "لا يوجد رد نهائي بعد",
    "prompt.pinFailed": "تعذر تحديث التثبيت",
    "tabs.inbox": "الجلسات",
    "mobile.back": "رجوع",
    "mobile.openSettings": "الإعدادات",
    "mobile.sessionListTitle": "الجلسات",
    "mobile.sessionListSubtitle": "احتفظ فقط بالمحادثات التي تحتاج فعلًا إلى متابعتها الآن.",
    "mobile.detailMeta": "{project} · {time}",
    "mobile.emptyDetail": "اختر جلسة من القائمة أولًا.",
    "mobile.status.running": "التنفيذ جارٍ الآن. ستتم مزامنة النتائج تلقائيًا.",
    "mobile.status.failed": "فشلت الجولة السابقة. يمكنك المتابعة مباشرة من هنا.",
    "mobile.status.queued": "تمت إضافتها إلى قائمة الانتظار. ابق على هذه الشاشة وسيتم التحديث.",
    "mobile.status.ready": "الجلسة الآن في وضع الخمول. أرسل الرسالة التالية عندما تكون جاهزًا.",
  },
  ru: {
    "sidebar.filter.pinned": "Закреплённые",
    "sidebar.live": "Мгновенная синхронизация",
    "sidebar.reconnecting": "Переподключение",
    "sidebar.polling": "Резервный опрос",
    "sidebar.offline": "Не в сети",
    "session.pin": "Закрепить",
    "session.unpin": "Открепить",
    "session.pinned": "Закреплено",
    "session.more": "Ещё",
    "session.quickContinue": "Продолжить",
    "current.sync": "Состояние синхронизации",
    "current.lastReply": "Последний ответ",
    "current.noReply": "Финального ответа пока нет",
    "prompt.pinFailed": "Не удалось обновить закрепление",
    "tabs.inbox": "Сессии",
    "mobile.back": "Назад",
    "mobile.openSettings": "Настройки",
    "mobile.sessionListTitle": "Сессии",
    "mobile.sessionListSubtitle": "Оставьте только те треды, которые действительно нужно продолжать сейчас.",
    "mobile.detailMeta": "{project} · {time}",
    "mobile.emptyDetail": "Сначала выберите сессию из списка.",
    "mobile.status.running": "Выполнение идёт. Результаты синхронизируются автоматически.",
    "mobile.status.failed": "Предыдущий ход завершился ошибкой. Можно продолжить прямо отсюда.",
    "mobile.status.queued": "Сессия в очереди. Оставайтесь на этом экране, и данные обновятся.",
    "mobile.status.ready": "Сессия сейчас свободна. Отправьте следующее сообщение, когда будете готовы.",
  },
  th: {
    "sidebar.filter.pinned": "ปักหมุด",
    "sidebar.live": "ซิงก์สด",
    "sidebar.reconnecting": "กำลังเชื่อมต่อใหม่",
    "sidebar.polling": "สำรองด้วยการโพล",
    "sidebar.offline": "ออฟไลน์",
    "session.pin": "ปักหมุด",
    "session.unpin": "เลิกปักหมุด",
    "session.pinned": "ปักหมุดแล้ว",
    "session.more": "เพิ่มเติม",
    "session.quickContinue": "ต่อ",
    "current.sync": "สถานะการซิงก์",
    "current.lastReply": "คำตอบล่าสุด",
    "current.noReply": "ยังไม่มีคำตอบสุดท้าย",
    "prompt.pinFailed": "อัปเดตการปักหมุดไม่สำเร็จ",
    "tabs.inbox": "เซสชัน",
    "mobile.back": "ย้อนกลับ",
    "mobile.openSettings": "การตั้งค่า",
    "mobile.sessionListTitle": "เซสชัน",
    "mobile.sessionListSubtitle": "เก็บไว้เฉพาะเธรดที่ต้องเดินหน้าต่อจริง ๆ ในตอนนี้",
    "mobile.detailMeta": "{project} · {time}",
    "mobile.emptyDetail": "เลือกเซสชันจากรายการก่อน",
    "mobile.status.running": "กำลังทำงานอยู่ ผลลัพธ์จะซิงก์กลับมาให้อัตโนมัติ",
    "mobile.status.failed": "รอบก่อนหน้าล้มเหลว คุณสามารถต่อจากตรงนี้ได้เลย",
    "mobile.status.queued": "เข้าคิวแล้ว อยู่หน้านี้ไว้และระบบจะอัปเดตให้",
    "mobile.status.ready": "ตอนนี้ว่างอยู่ ส่งข้อความถัดไปได้เมื่อพร้อม",
  },
};

Object.entries(I18N_PATCH).forEach(([language, patch]) => {
  I18N[language] = { ...(I18N[language] || {}), ...patch };
});

function normalizeUiLanguage(value) {
  const supported = UI_LANGUAGE_OPTIONS.map((item) => item.value);
  const input = String(value || "").trim();
  if (!input) {
    return "zh-CN";
  }
  if (supported.includes(input)) {
    return input;
  }
  const lower = input.toLowerCase();
  const matched = supported.find((item) => item.toLowerCase() === lower || item.toLowerCase().startsWith(`${lower}-`) || lower.startsWith(item.toLowerCase()));
  return matched || "zh-CN";
}

function loadStoredUiLanguage() {
  try {
    return window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  } catch {
    return "";
  }
}

function persistUiLanguage(value) {
  try {
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, normalizeUiLanguage(value));
  } catch {}
}

function initialUiLanguage() {
  const browserLanguage = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return normalizeUiLanguage(loadStoredUiLanguage() || browserLanguage || "zh-CN");
}

function currentUiLanguage() {
  return normalizeUiLanguage(state.settingsUiLanguage || state.uiLanguage || state.system?.settings?.ui_language || state.system?.default_ui_language || "zh-CN");
}

function interpolate(template, variables = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => String(variables[key] ?? ""));
}

function t(key, variables = {}) {
  const language = currentUiLanguage();
  const bundle = I18N[language] || I18N["zh-CN"];
  const fallback = I18N["zh-CN"];
  return interpolate(bundle[key] ?? fallback[key] ?? key, variables);
}

function uiLanguageLabel(value) {
  return UI_LANGUAGE_OPTIONS.find((item) => item.value === normalizeUiLanguage(value))?.label || value || "zh-CN";
}

function applyUiLanguage() {
  const language = currentUiLanguage();
  state.uiLanguage = language;
  persistUiLanguage(language);
  document.documentElement.lang = language;
  document.documentElement.dir = RTL_UI_LANGUAGES.has(language) ? "rtl" : "ltr";
  document.body.dir = document.documentElement.dir;
  document.body.classList.toggle("rtl-ui", RTL_UI_LANGUAGES.has(language));
  document.title = t("meta.appTitle");
}

function formatCount(value, language = currentUiLanguage()) {
  try {
    return new Intl.NumberFormat(language).format(Number(value || 0));
  } catch {
    return String(value || 0);
  }
}

function formatProjectSessionCount(count, total) {
  const summary = total !== count ? `${formatCount(count)} / ${formatCount(total)}` : formatCount(count);
  return t("project.sessionCount", { count: summary });
}

state.uiLanguage = initialUiLanguage();
state.settingsUiLanguage = state.uiLanguage;

function detectRuntime() {
  const params = new URLSearchParams(window.location.search);
  const userAgent = navigator.userAgent || "";
  const mobileClient = params.get("client");
  const isMobileShell = /\bCodexAppMobile\b/i.test(userAgent) || mobileClient === "mobile";
  let platform = "";
  if (/android/i.test(userAgent)) {
    platform = "android";
  } else if (/\b(iPhone|iPad|iPod)\b/i.test(userAgent) || /\bios\b/i.test(userAgent)) {
    platform = "ios";
  } else if (isMobileShell) {
    platform = "mobile";
  }
  return {
    isMobileShell,
    platform,
  };
}

function isMobileShellClient() {
  return Boolean(state.runtime?.isMobileShell);
}

function syncRuntimeDecorations() {
  document.body.classList.toggle("mobile-shell", isMobileShellClient());
  document.body.dataset.client = isMobileShellClient() ? "mobile-shell" : "web";
  if (state.runtime?.platform) {
    document.body.dataset.platform = state.runtime.platform;
  } else {
    delete document.body.dataset.platform;
  }
  const viewportMeta = document.getElementById("viewport-meta");
  if (viewportMeta) {
    viewportMeta.setAttribute(
      "content",
      isMobileShellClient()
        ? "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        : "width=device-width, initial-scale=1.0, viewport-fit=cover",
    );
  }
}

function renderTerminalAction(session) {
  if (isMobileShellClient()) {
    return "";
  }
  return `<button class="ghost-button small-button" data-action="open-terminal" data-session-id="${escapeHtml(session.id)}" ${session.codex_thread_id ? "" : "disabled"}>${escapeHtml(t("session.openTerminal"))}</button>`;
}

function renderTerminalSettingsSummary() {
  if (isMobileShellClient()) {
    return "";
  }
  return `
        <article class="status-card">
          <span>${escapeHtml(t("settings.terminalApp"))}</span>
          <strong>${escapeHtml(terminalAppLabel(state.system?.settings?.terminal_app || state.system?.default_terminal_app || "terminal"))}</strong>
        </article>
  `;
}

function renderTerminalSettingsField() {
  if (isMobileShellClient()) {
    return "";
  }
  return `
          <label>
            <span>${escapeHtml(t("settings.terminalApp"))}</span>
            <select name="terminal_app">
              ${(state.system?.terminal_apps || ["terminal", "iterm"])
                .map(
                  (value) =>
                    `<option value="${escapeHtml(value)}" ${state.settingsTerminalApp === value ? "selected" : ""}>${escapeHtml(terminalAppLabel(value))}</option>`,
                )
                .join("")}
            </select>
          </label>
  `;
}

function renderNewSessionWorkspaceField() {
  if (!isMobileShellClient() || !state.workspaces.length) {
    return `
          <label>
            <span>${escapeHtml(t("newSession.workspaceLabel"))}</span>
            <input name="cwd" value="${escapeHtml(state.newSessionCwd)}" placeholder="${escapeHtml(t("newSession.workspacePlaceholder"))}" />
          </label>
    `;
  }

  const normalizedCwd = normalizePath(state.newSessionCwd);
  const hasCurrentOption = state.workspaces.some((workspace) => normalizePath(workspace.path) === normalizedCwd);
  const options = hasCurrentOption
    ? state.workspaces
    : [
        ...state.workspaces,
        {
          name: basename(state.newSessionCwd) || state.newSessionCwd || t("newSession.workspaceLabel"),
          path: state.newSessionCwd,
        },
      ];

  return `
          <label>
            <span>${escapeHtml(t("newSession.workspaceLabel"))}</span>
            <select name="cwd">
              ${options
                .map(
                  (workspace) =>
                    `<option value="${escapeHtml(workspace.path)}" ${normalizePath(workspace.path) === normalizedCwd ? "selected" : ""}>${escapeHtml(workspace.name)} · ${escapeHtml(workspace.path)}</option>`,
                )
                .join("")}
            </select>
          </label>
  `;
}

function selectedSession() {
  return state.sessions.find((item) => item.id === state.selectedSessionId) || null;
}

function selectedActiveRun() {
  return state.runs.find((run) => run.status === "queued" || run.status === "running") || state.runs[0] || null;
}

function sessionLatestPrompt(session) {
  return String(session?.latest_run?.prompt || "").trim();
}

function sessionFinalReply(session) {
  return String(session?.latest_run?.final_message || "").trim();
}

function sessionSearchableText(session) {
  return [
    session?.title,
    session?.cwd,
    session?.branch_name,
    session?.model,
    sessionLatestPrompt(session),
    session?.codex_thread_id,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function sessionMatchesFilter(session) {
  if (!session) {
    return false;
  }
  const filter = state.sessionFilter;
  if (filter === "active" && !["queued", "running"].includes(session.status)) {
    return false;
  }
  if (filter === "failed" && session.status !== "failed") {
    return false;
  }
  if (filter === "ready" && session.status !== "ready") {
    return false;
  }
  if (filter === "pinned" && !session.pinned) {
    return false;
  }
  const query = String(state.sessionSearchQuery || "").trim().toLowerCase();
  if (!query) {
    return true;
  }
  return sessionSearchableText(session).includes(query);
}

function filteredSessions() {
  return state.sessions.filter(sessionMatchesFilter);
}

function basename(value) {
  const normalized = String(value || "").replace(/\/+$/, "");
  return normalized ? normalized.split("/").pop() || normalized : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body,
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => ({ ok: false, error: { message: t("api.invalidJson") } }));
  if (!response.ok || !payload.ok) {
    const message = payload?.error?.message || t("api.requestFailed", { status: response.status });
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload.data;
}

function formatTime(value) {
  if (!value) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat(currentUiLanguage(), {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatRelative(value) {
  if (!value) {
    return "";
  }
  const target = new Date(value);
  const diffMinutes = Math.round((Date.now() - target.getTime()) / 60000);
  if (Number.isNaN(diffMinutes)) {
    return value;
  }
  if (Math.abs(diffMinutes) < 1) {
    return t("time.justNow");
  }
  let unit = "minute";
  let amount = -diffMinutes;
  if (Math.abs(diffMinutes) >= 60 && Math.abs(diffMinutes) < 24 * 60) {
    unit = "hour";
    amount = -Math.round(diffMinutes / 60);
  } else if (Math.abs(diffMinutes) >= 24 * 60) {
    unit = "day";
    amount = -Math.round(diffMinutes / (24 * 60));
  }
  try {
    return new Intl.RelativeTimeFormat(currentUiLanguage(), { numeric: "auto" }).format(amount, unit);
  } catch {
    return value;
  }
}

function reasoningEffortLabel(level) {
  return I18N[currentUiLanguage()]?.[`reasoning.${level}`] || I18N["zh-CN"]?.[`reasoning.${level}`] || level || t("common.notSet");
}

function terminalAppLabel(value) {
  return {
    terminal: "Terminal",
    iterm: "iTerm",
  }[value] || value || "Terminal";
}

function sandboxModeLabel(value) {
  return I18N[currentUiLanguage()]?.[`sandbox.${value}`] || I18N["zh-CN"]?.[`sandbox.${value}`] || value || t("sandbox.workspace-write");
}

function approvalPolicyLabel(value) {
  return I18N[currentUiLanguage()]?.[`approval.${value}`] || I18N["zh-CN"]?.[`approval.${value}`] || value || t("approval.never");
}

function gitWriteEscalationLabel(enabled) {
  return enabled ? t("gitWrite.enabled") : t("gitWrite.disabled");
}

function normalizePath(value) {
  return String(value || "").replace(/\/+$/, "");
}

function truncateText(value, limit = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function hasMessage(role, text, items = state.messages) {
  const targetRole = String(role || "").trim();
  const targetText = String(text || "").trim();
  if (!targetRole || !targetText) {
    return false;
  }
  return (items || []).some((message) => String(message.role || "").trim() === targetRole && String(message.text || "").trim() === targetText);
}

function ensureOptimisticFinalMessage(run) {
  if (!run?.final_message || hasMessage("assistant", run.final_message)) {
    return;
  }
  state.messages = [
    ...state.messages,
    {
      id: `optimistic_${run.id}`,
      role: "assistant",
      type: "message",
      text: run.final_message,
      kind: "summary",
      created_at: run.completed_at || new Date().toISOString(),
    },
  ];
}

function workspaceForCwd(cwd) {
  const current = normalizePath(cwd);
  let bestMatch = null;
  for (const workspace of state.workspaces) {
    const base = normalizePath(workspace.path);
    if (!base) {
      continue;
    }
    if (current === base || current.startsWith(`${base}/`)) {
      if (!bestMatch || base.length > normalizePath(bestMatch.path).length) {
        bestMatch = workspace;
      }
    }
  }
  return bestMatch;
}

function isWorkspaceExpanded(workspace) {
  const stored = state.expandedWorkspacePaths[workspace.path];
  if (typeof stored === "boolean") {
    return stored;
  }
  const session = selectedSession();
  return Boolean(workspace.pinned || workspace.path === session?.cwd);
}

function visibleWorkspaceGroups() {
  const filtered = filteredSessions();
  const sessionMap = new Map();
  for (const session of filtered) {
    const workspace = workspaceForCwd(session.cwd);
    if (!workspace) {
      continue;
    }
    const list = sessionMap.get(workspace.path) || [];
    list.push(session);
    sessionMap.set(workspace.path, list);
  }
  return state.workspaces
    .map((workspace) => ({
      workspace,
      sessions: sessionMap.get(workspace.path) || [],
      totalSessions: state.sessions.filter((session) => workspaceForCwd(session.cwd)?.path === workspace.path).length,
    }))
    .filter((group) => group.sessions.length > 0 || group.workspace.pinned || normalizePath(state.newSessionCwd).startsWith(normalizePath(group.workspace.path)));
}

function sessionsForWorkspacePath(workspacePath) {
  return state.sessions.filter((session) => workspaceForCwd(session.cwd)?.path === workspacePath);
}

function statusBadge(status) {
  const tones = {
    ready: "soft",
    failed: "danger",
    queued: "warn",
    running: "accent",
    completed: "soft",
    cancelled: "muted",
  };
  return `<span class="badge ${tones[status] || "muted"}">${escapeHtml(sessionStatusLabel(status))}</span>`;
}

function syncStatusMeta() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { tone: "warn", label: t("sidebar.offline") };
  }
  if (state.wsConnected) {
    return { tone: "accent", label: t("sidebar.live") };
  }
  if (state.wsReconnectTimer) {
    return { tone: "warn", label: t("sidebar.reconnecting") };
  }
  return { tone: "soft", label: t("sidebar.polling") };
}

function syncStatusBadge() {
  const sync = syncStatusMeta();
  return `<span class="connection ${escapeHtml(sync.tone)}">${escapeHtml(sync.label)}</span>`;
}

function clearSessionFx() {
  if (state.sessionFxTimer) {
    window.clearTimeout(state.sessionFxTimer);
    state.sessionFxTimer = null;
  }
  state.sessionFx = null;
}

function triggerSessionFx(sessionId, type, duration = 1200) {
  if (!sessionId) {
    return;
  }
  clearSessionFx();
  state.sessionFx = {
    sessionId,
    type,
    expiresAt: Date.now() + duration,
  };
  state.sessionFxTimer = window.setTimeout(() => {
    state.sessionFx = null;
    state.sessionFxTimer = null;
    render();
  }, duration);
}

function sessionFxClass(sessionId, type) {
  if (!state.sessionFx || state.sessionFx.sessionId !== sessionId || state.sessionFx.type !== type) {
    return "";
  }
  return type === "pin" ? "fx-pin" : "fx-focus";
}

function syncSettingsState() {
  const settings = state.system?.settings || {};
  state.settingsModel = String(settings.model || state.system?.default_model || "").trim();
  state.settingsEffort = String(settings.reasoning_effort || state.system?.default_reasoning_effort || "medium").trim().toLowerCase() || "medium";
  state.settingsUiLanguage = normalizeUiLanguage(settings.ui_language || state.system?.default_ui_language || state.uiLanguage || "zh-CN");
  state.uiLanguage = state.settingsUiLanguage;
  state.settingsTerminalApp = String(settings.terminal_app || state.system?.default_terminal_app || "terminal").trim().toLowerCase() || "terminal";
  state.settingsSandboxMode = String(settings.sandbox_mode || state.system?.default_sandbox_mode || "workspace-write").trim().toLowerCase() || "workspace-write";
  state.settingsApprovalPolicy = String(settings.approval_policy || state.system?.default_approval_policy || "never").trim().toLowerCase() || "never";
  state.settingsGitWriteEnabled = Boolean(settings.git_write_enabled || state.system?.default_git_write_enabled);
  state.settingsGitWriteSandboxMode =
    String(settings.git_write_sandbox_mode || state.system?.default_git_write_sandbox_mode || "danger-full-access").trim().toLowerCase() || "danger-full-access";
  state.settingsGitWriteApprovalPolicy =
    String(settings.git_write_approval_policy || state.system?.default_git_write_approval_policy || "on-request").trim().toLowerCase() || "on-request";
}

function scrollCurrentSessionToBottom() {
  const applyScroll = () => {
    const form = document.getElementById("resume-form");
    const messageList = document.querySelector(".message-list");
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
    if (form) {
      form.scrollIntoView({ block: "end" });
      window.scrollTo(0, document.documentElement.scrollHeight);
      return;
    }
    const panel = document.querySelector(".conversation-panel");
    if (panel) {
      panel.scrollIntoView({ block: "end" });
      window.scrollTo(0, document.documentElement.scrollHeight);
    }
  };
  window.requestAnimationFrame(() => {
    applyScroll();
    window.requestAnimationFrame(applyScroll);
  });
}

function extractAgentMessage(item) {
  if (!item || typeof item !== "object") {
    return "";
  }
  const direct = String(item.text || "").trim();
  if (direct) {
    return direct;
  }
  if (!Array.isArray(item.content)) {
    return "";
  }
  return item.content
    .map((chunk) => (chunk && typeof chunk === "object" ? String(chunk.text || "") : ""))
    .join("")
    .trim();
}

function eventHighlight(event) {
  if (!event) {
    return null;
  }
  if (event.event_type === "thread.started") {
    const payload = event.payload?.payload || event.payload || {};
    return {
      tone: "soft",
      title: t("event.sessionConnected"),
      detail: payload.thread_id ? t("event.threadId", { id: payload.thread_id }) : t("event.threadCreated"),
    };
  }
  if (event.event_type === "item.completed") {
    const payload = event.payload?.payload || event.payload || {};
    const text = extractAgentMessage(payload.item);
    if (!text) {
      return null;
    }
    return {
      tone: "accent",
      title: t("event.assistantResult"),
      detail: truncateText(text, 160),
    };
  }
  if (event.event_type === "turn.completed") {
    const payload = event.payload?.payload || event.payload || {};
    const tokens = payload?.usage?.output_tokens;
    return {
      tone: "accent",
      title: t("event.turnCompleted"),
      detail: tokens ? t("event.outputTokens", { tokens: formatCount(tokens) }) : t("event.cliCompleted"),
    };
  }
  if (event.event_type === "cli_log") {
    const stream = String(event.payload?.stream || "").toLowerCase();
    const line = truncateText(event.payload?.line || "", 160);
    if (!line) {
      return null;
    }
    if (stream === "stderr") {
      return {
        tone: "danger",
        title: t("event.logError"),
        detail: line,
      };
    }
    return {
      tone: "muted",
      title: t("event.cliLog"),
      detail: line,
    };
  }
  return {
    tone: "muted",
    title: event.event_type,
    detail: truncateText(JSON.stringify(event.payload || {}), 160),
  };
}

function recentRunHighlights(run, events) {
  const items = [];
  if (run) {
    const startedAt = run.started_at ? t("highlight.startedAt", { time: formatTime(run.started_at) }) : "";
    const endedAt = run.completed_at ? t("highlight.endedAt", { time: formatTime(run.completed_at) }) : "";
    items.push({
      tone: run.status === "failed" ? "danger" : run.status === "cancelled" ? "warn" : run.status === "running" ? "accent" : "soft",
      title: t("highlight.currentStatus"),
      detail: `${sessionStatusLabel(run.status)}${startedAt}${endedAt}`,
    });
    if (run.final_message) {
      items.push({
        tone: "accent",
        title: t("highlight.finalReply"),
        detail: truncateText(run.final_message, 160),
      });
    }
    if (run.status === "failed" && run.stderr_tail) {
      const lastLine = truncateText(run.stderr_tail.split("\n").filter(Boolean).slice(-1)[0] || run.stderr_tail, 160);
      if (lastLine) {
        items.push({
          tone: "danger",
          title: t("highlight.failureReason"),
          detail: lastLine,
        });
      }
    }
  }
  const eventItems = (events || [])
    .map(eventHighlight)
    .filter(Boolean)
    .slice(-6)
    .reverse();
  return [...items, ...eventItems].slice(0, 6);
}

function sessionStatusLabel(status) {
  return I18N[currentUiLanguage()]?.[`status.${status}`] || I18N["zh-CN"]?.[`status.${status}`] || status || t("status.unknown");
}

function sessionVerificationLabel(session) {
  const latestRun = session?.latest_run;
  if (!latestRun) {
    return t("verification.noRuns");
  }
  if (latestRun.status === "failed") {
    return t("verification.failed");
  }
  if (latestRun.status === "cancelled") {
    return t("verification.cancelled");
  }
  if (latestRun.status === "running") {
    return t("verification.running");
  }
  if (latestRun.status === "queued") {
    return t("verification.queued");
  }
  return latestRun.final_message ? t("verification.hasResult") : t("verification.noSummary");
}

function renderSidebarFilters() {
  const options = [
    ["all", t("sidebar.filter.all")],
    ["active", t("sidebar.filter.active")],
    ["failed", t("sidebar.filter.failed")],
    ["ready", t("sidebar.filter.ready")],
    ["pinned", t("sidebar.filter.pinned")],
  ];
  const filteredCount = filteredSessions().length;
  return `
    <section class="sidebar-toolbar shell-subpanel">
      <label class="search-field">
        <span>${escapeHtml(t("sidebar.searchLabel"))}</span>
        <input id="session-search-input" value="${escapeHtml(state.sessionSearchQuery)}" placeholder="${escapeHtml(t("sidebar.searchPlaceholder"))}" />
      </label>
      <div class="filter-strip">
        ${options
          .map(
            ([value, label]) =>
              `<button class="filter-chip ${state.sessionFilter === value ? "active" : ""}" type="button" data-action="set-session-filter" data-filter="${escapeHtml(value)}">${escapeHtml(label)}</button>`,
          )
          .join("")}
      </div>
      <p class="subtle sidebar-filter-summary">${escapeHtml(t("sidebar.countSummary", { shown: formatCount(filteredCount), total: formatCount(state.sessions.length) }))}</p>
    </section>
  `;
}

function mobileSessions() {
  return filteredSessions();
}

function mobileStatusMessage(session) {
  const status = session?.latest_run?.status || session?.status || "ready";
  if (status === "running") {
    return t("mobile.status.running");
  }
  if (status === "failed") {
    return t("mobile.status.failed");
  }
  if (status === "queued") {
    return t("mobile.status.queued");
  }
  return t("mobile.status.ready");
}

function renderMobileInbox() {
  const sessions = mobileSessions();
  return `
    <section class="mobile-screen mobile-inbox">
      <header class="mobile-page-head shell-subpanel">
        <div>
          <p class="eyebrow">${escapeHtml(t("sidebar.live"))}</p>
          <h1>${escapeHtml(t("mobile.sessionListTitle"))}</h1>
          <p class="subtle">${escapeHtml(t("mobile.sessionListSubtitle"))}</p>
        </div>
        <div class="mobile-page-actions">
          ${syncStatusBadge()}
          <button class="primary-button small-button" type="button" data-action="focus-new-session">${escapeHtml(t("sidebar.newSession"))}</button>
          <button class="ghost-button small-button" type="button" data-action="set-mobile-tab" data-tab="settings">${escapeHtml(t("mobile.openSettings"))}</button>
        </div>
      </header>

      ${renderSidebarFilters()}

      <section class="composer-card shell-subpanel sidebar-new-session ${state.newSessionExpanded ? "" : "collapsed"}">
        <div class="card-head">
          <p class="eyebrow">${escapeHtml(t("newSession.eyebrow"))}</p>
          <h3>${escapeHtml(t("newSession.title"))}</h3>
          <p class="subtle">${escapeHtml(t("newSession.subtitle.mobile"))}</p>
        </div>
        <form id="new-session-form" class="composer-form">
          ${renderNewSessionWorkspaceField()}
          <label>
            <span>${escapeHtml(t("newSession.initialPromptLabel"))}</span>
            <textarea name="prompt" placeholder="${escapeHtml(t("newSession.initialPromptPlaceholder"))}">${escapeHtml(state.newSessionPrompt)}</textarea>
          </label>
          <div class="composer-actions">
            <button class="ghost-button" type="button" data-action="cancel-new-session">${escapeHtml(t("newSession.collapse"))}</button>
            <button class="primary-button" type="submit" ${state.busy ? "disabled" : ""}>${escapeHtml(state.busy ? t("newSession.creating") : t("newSession.createAndRun"))}</button>
          </div>
        </form>
      </section>

      <div class="mobile-session-list">
        ${sessions.length
          ? sessions
              .map(
                (session) => `
                  <article class="mobile-session-card ${session.id === state.selectedSessionId ? "active" : ""} ${session.pinned ? "pinned" : ""}">
                    <button class="mobile-session-main" type="button" data-session-id="${escapeHtml(session.id)}">
                      <div class="mobile-session-topline">
                        <strong>${escapeHtml(session.title || t("session.unnamed"))}</strong>
                        ${statusBadge(session.status)}
                      </div>
                      <p class="mobile-session-summary">${escapeHtml(truncateText(sessionFinalReply(session) || sessionLatestPrompt(session) || session.cwd, 120))}</p>
                      <div class="mobile-session-meta">
                        <span>${escapeHtml(t("mobile.detailMeta", { project: basename(session.cwd) || t("session.projectUnknown"), time: formatRelative(session.updated_at) }))}</span>
                      </div>
                    </button>
                    <div class="mobile-session-actions">
                      <button class="ghost-button small-button" type="button" data-action="toggle-session-pin" data-session-id="${escapeHtml(session.id)}" data-pinned="${session.pinned ? "true" : "false"}">${escapeHtml(session.pinned ? t("session.unpin") : t("session.pin"))}</button>
                      <button class="primary-button small-button" type="button" data-action="continue-session" data-session-id="${escapeHtml(session.id)}">${escapeHtml(t("session.quickContinue"))}</button>
                    </div>
                  </article>
                `,
              )
              .join("")
          : `<div class="empty-panel">${escapeHtml(t("workspace.noManaged"))}</div>`}
      </div>
    </section>
  `;
}

function renderSettingsSections() {
  const languageOptions = state.system?.supported_ui_languages || UI_LANGUAGE_OPTIONS.map((item) => item.value);
  return `
    <section class="settings-summary-grid">
      <article class="status-card">
        <span>${escapeHtml(t("settings.codexCli"))}</span>
        <strong>${escapeHtml(state.system?.codex_cli_version || t("settings.notDetected"))}</strong>
      </article>
      <article class="status-card">
        <span>${escapeHtml(t("settings.defaultModel"))}</span>
        <strong>${escapeHtml(state.system?.settings?.model || state.system?.default_model || t("settings.notConfigured"))}</strong>
      </article>
      <article class="status-card">
        <span>${escapeHtml(t("settings.reasoning"))}</span>
        <strong>${escapeHtml(reasoningEffortLabel(state.system?.settings?.reasoning_effort || state.system?.default_reasoning_effort || "medium"))}</strong>
      </article>
      <article class="status-card">
        <span>${escapeHtml(t("settings.language"))}</span>
        <strong>${escapeHtml(uiLanguageLabel(state.settingsUiLanguage || state.uiLanguage))}</strong>
      </article>
      ${renderTerminalSettingsSummary()}
      <article class="status-card">
        <span>${escapeHtml(t("settings.defaultExecution"))}</span>
        <strong>${escapeHtml(sandboxModeLabel(state.system?.settings?.sandbox_mode || state.system?.default_sandbox_mode || "workspace-write"))}</strong>
      </article>
      <article class="status-card">
        <span>${escapeHtml(t("settings.defaultApproval"))}</span>
        <strong>${escapeHtml(approvalPolicyLabel(state.system?.settings?.approval_policy || state.system?.default_approval_policy || "never"))}</strong>
      </article>
      <article class="status-card">
        <span>${escapeHtml(t("settings.gitWriteEscalation"))}</span>
        <strong>${escapeHtml(gitWriteEscalationLabel(state.settingsGitWriteEnabled))}</strong>
      </article>
      <article class="status-card">
        <span>${escapeHtml(t("settings.gitWritePermissions"))}</span>
        <strong>${escapeHtml(state.settingsGitWriteEnabled ? `${sandboxModeLabel(state.settingsGitWriteSandboxMode)} / ${approvalPolicyLabel(state.settingsGitWriteApprovalPolicy)}` : t("settings.followDefault"))}</strong>
      </article>
    </section>

    <section class="composer-card settings-card shell-subpanel">
      <div class="card-head">
        <p class="eyebrow">${escapeHtml(t("execution.eyebrow"))}</p>
        <h3>${escapeHtml(isMobileShellClient() ? t("execution.title.mobile") : t("execution.title.desktop"))}</h3>
      </div>
      <form id="settings-form" class="composer-form">
        <label>
          <span>${escapeHtml(t("settings.modelName"))}</span>
          <input name="settings_model" value="${escapeHtml(state.settingsModel)}" placeholder="${escapeHtml(t("settings.modelPlaceholder"))}" />
        </label>
        <label>
          <span>${escapeHtml(t("settings.language"))}</span>
          <select name="ui_language">
            ${languageOptions
              .map(
                (value) =>
                  `<option value="${escapeHtml(value)}" ${state.settingsUiLanguage === value ? "selected" : ""}>${escapeHtml(uiLanguageLabel(value))}</option>`,
              )
              .join("")}
          </select>
        </label>
        <div>
          <span class="field-title">${escapeHtml(t("settings.reasoning"))}</span>
          <div class="effort-toggle">
            ${(state.system?.reasoning_efforts || ["low", "medium", "high", "xhigh"])
              .map(
                (level) =>
                  `<button class="effort-chip ${state.settingsEffort === level ? "active" : ""}" type="button" data-action="set-settings-effort" data-effort="${escapeHtml(level)}">${escapeHtml(reasoningEffortLabel(level))}</button>`,
              )
              .join("")}
          </div>
        </div>
        ${renderTerminalSettingsField()}
        <label>
          <span>${escapeHtml(t("settings.sandbox"))}</span>
          <select name="sandbox_mode">
            ${(state.system?.sandbox_modes || ["read-only", "workspace-write", "danger-full-access"])
              .map(
                (value) =>
                  `<option value="${escapeHtml(value)}" ${state.settingsSandboxMode === value ? "selected" : ""}>${escapeHtml(sandboxModeLabel(value))}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label>
          <span>${escapeHtml(t("settings.approval"))}</span>
          <select name="approval_policy">
            ${(state.system?.approval_policies || ["untrusted", "on-request", "never"])
              .map(
                (value) =>
                  `<option value="${escapeHtml(value)}" ${state.settingsApprovalPolicy === value ? "selected" : ""}>${escapeHtml(approvalPolicyLabel(value))}</option>`,
              )
              .join("")}
            </select>
        </label>
        <label class="toggle-field">
          <div class="toggle-copy">
            <span>${escapeHtml(t("settings.allowGitWrite"))}</span>
            <p class="subtle">${
              isMobileShellClient()
                ? escapeHtml(t("settings.gitWriteHint.mobile"))
                : escapeHtml(t("settings.gitWriteHint.desktop"))
            }</p>
          </div>
          <input name="git_write_enabled" type="checkbox" ${state.settingsGitWriteEnabled ? "checked" : ""} />
        </label>
        <div class="settings-subgrid">
          <label>
            <span>${escapeHtml(t("settings.gitWriteSandbox"))}</span>
            <select name="git_write_sandbox_mode" ${state.settingsGitWriteEnabled ? "" : "disabled"}>
              ${(state.system?.sandbox_modes || ["read-only", "workspace-write", "danger-full-access"])
                .map(
                  (value) =>
                    `<option value="${escapeHtml(value)}" ${state.settingsGitWriteSandboxMode === value ? "selected" : ""}>${escapeHtml(sandboxModeLabel(value))}</option>`,
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>${escapeHtml(t("settings.gitWriteApproval"))}</span>
            <select name="git_write_approval_policy" ${state.settingsGitWriteEnabled ? "" : "disabled"}>
              ${(state.system?.approval_policies || ["untrusted", "on-request", "never"])
                .map(
                  (value) =>
                    `<option value="${escapeHtml(value)}" ${state.settingsGitWriteApprovalPolicy === value ? "selected" : ""}>${escapeHtml(approvalPolicyLabel(value))}</option>`,
                )
                .join("")}
            </select>
          </label>
        </div>
        <p class="subtle">${
          isMobileShellClient()
            ? escapeHtml(t("settings.scopeHint.mobile"))
            : escapeHtml(t("settings.scopeHint.desktop"))
        }</p>
        <div class="composer-actions">
          <button class="primary-button" type="submit" ${state.settingsSaving ? "disabled" : ""}>${escapeHtml(state.settingsSaving ? t("settings.saving") : t("settings.save"))}</button>
        </div>
      </form>
    </section>

    <section class="composer-card settings-card shell-subpanel">
      <div class="card-head">
        <p class="eyebrow">${escapeHtml(t("security.eyebrow"))}</p>
        <h3>${escapeHtml(t("security.title"))}</h3>
      </div>
      <form id="password-form" class="composer-form">
        <label>
          <span>${escapeHtml(t("security.currentPassword"))}</span>
          <input name="current_password" type="password" value="${escapeHtml(state.passwordCurrent)}" autocomplete="current-password" />
        </label>
        <label>
          <span>${escapeHtml(t("security.newPassword"))}</span>
          <input name="new_password" type="password" value="${escapeHtml(state.passwordNext)}" autocomplete="new-password" />
        </label>
        <label>
          <span>${escapeHtml(t("security.confirmPassword"))}</span>
          <input name="confirm_password" type="password" value="${escapeHtml(state.passwordConfirm)}" autocomplete="new-password" />
        </label>
        <div class="composer-actions">
          <button class="ghost-button" type="button" data-action="clear-password-form">${escapeHtml(t("security.clear"))}</button>
          <button class="primary-button" type="submit" ${state.passwordSaving ? "disabled" : ""}>${escapeHtml(state.passwordSaving ? t("security.saving") : t("security.save"))}</button>
        </div>
      </form>
    </section>
  `;
}

function renderMobileSettings() {
  return `
    <section class="mobile-screen mobile-settings">
      <header class="mobile-page-head shell-subpanel">
        <div>
          <p class="eyebrow">${escapeHtml(t("settings.eyebrow"))}</p>
          <h1>${escapeHtml(t("settings.title"))}</h1>
          <p class="subtle">${escapeHtml(t("settings.subtitle"))}</p>
        </div>
        <div class="mobile-page-actions">
          <button class="ghost-button small-button" type="button" data-action="set-mobile-tab" data-tab="inbox">${escapeHtml(t("mobile.back"))}</button>
          <button class="ghost-button small-button" type="button" data-action="logout">${escapeHtml(t("settings.logout"))}</button>
        </div>
      </header>
      <div class="mobile-settings-stack">
        ${renderSettingsSections()}
      </div>
    </section>
  `;
}

function renderMobileDetail() {
  const session = selectedSession();
  const latestRun = session?.latest_run || selectedActiveRun();
  if (!session) {
    return `
      <section class="mobile-screen mobile-detail">
        <header class="mobile-page-head shell-subpanel">
          <button class="ghost-button small-button" type="button" data-action="set-mobile-tab" data-tab="inbox">${escapeHtml(t("mobile.back"))}</button>
        </header>
        <div class="empty-panel tall">${escapeHtml(t("mobile.emptyDetail"))}</div>
      </section>
    `;
  }
  return `
    <section class="mobile-screen mobile-detail ${sessionFxClass(session.id, "focus")} ${sessionFxClass(session.id, "pin")}">
      <header class="mobile-page-head shell-subpanel mobile-detail-head">
        <div class="mobile-detail-head-row">
          <button class="ghost-button small-button" type="button" data-action="set-mobile-tab" data-tab="inbox">${escapeHtml(t("mobile.back"))}</button>
          <button class="ghost-button small-button" type="button" data-action="set-mobile-tab" data-tab="settings">${escapeHtml(t("mobile.openSettings"))}</button>
        </div>
        <div class="mobile-detail-copy">
          <p class="eyebrow">${escapeHtml(t("conversation.eyebrow"))}</p>
          <h1>${escapeHtml(session.title || t("session.unnamed"))}</h1>
          <p class="subtle">${escapeHtml(t("mobile.detailMeta", { project: basename(session.cwd) || t("session.projectUnknown"), time: formatRelative(session.updated_at) }))}</p>
        </div>
        <div class="mobile-detail-head-row">
          ${syncStatusBadge()}
          ${statusBadge(session.status)}
          <button class="ghost-button small-button" type="button" data-action="toggle-session-pin" data-session-id="${escapeHtml(session.id)}" data-pinned="${session.pinned ? "true" : "false"}">${escapeHtml(session.pinned ? t("session.unpin") : t("session.pin"))}</button>
        </div>
      </header>

      <section class="mobile-status-banner shell-subpanel ${latestRun?.status || session.status}">
        <strong>${escapeHtml(sessionStatusLabel(latestRun?.status || session.status))}</strong>
        <p>${escapeHtml(mobileStatusMessage(session))}</p>
      </section>

      <section class="messages-panel shell-subpanel conversation-panel mobile-conversation-panel">
        ${renderMessages()}
        ${renderComposer()}
      </section>
    </section>
  `;
}

function renderMobileApp() {
  const screen = state.mobileTab === "settings" ? renderMobileSettings() : state.mobileTab === "detail" ? renderMobileDetail() : renderMobileInbox();
  return `
    <main class="screen workspace-shell mobile-shell-app">
      ${screen}
      <div class="mobile-tabs ${state.mobileTab === "detail" ? "hidden" : ""}">
        <button class="mobile-tab-button ${state.mobileTab === "inbox" ? "active" : ""}" data-action="set-mobile-tab" data-tab="inbox">${escapeHtml(t("tabs.inbox"))}</button>
        <button class="mobile-tab-button ${state.mobileTab === "settings" ? "active" : ""}" data-action="set-mobile-tab" data-tab="settings">${escapeHtml(t("tabs.settings"))}</button>
      </div>
    </main>
  `;
}

function renderLogin() {
  document.getElementById("app").innerHTML = `
    <main class="screen auth-screen">
      <section class="auth-card">
        <p class="eyebrow">${escapeHtml(t("login.eyebrow"))}</p>
        <h1>${escapeHtml(t("login.title"))}</h1>
        <p class="subtle">${escapeHtml(t("login.subtitle"))}</p>
        <form id="login-form" class="stack">
          <label>
            <span>${escapeHtml(t("login.username"))}</span>
            <input name="username" value="admin" autocomplete="username" />
          </label>
          <label>
            <span>${escapeHtml(t("login.password"))}</span>
            <input name="password" type="password" autocomplete="current-password" />
          </label>
          ${state.loginError ? `<p class="error-text">${escapeHtml(state.loginError)}</p>` : ""}
          <button class="primary-button" type="submit">${escapeHtml(t("login.submit"))}</button>
        </form>
      </section>
    </main>
  `;

  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: String(form.get("username") || ""),
          password: String(form.get("password") || ""),
        }),
      });
      state.loginError = "";
      await bootstrap();
    } catch (error) {
      state.loginError = error.message || t("login.failed");
      render();
    }
  });
}

function renderSidebar() {
  const groups = visibleWorkspaceGroups();
  const sidebarSummary = isMobileShellClient()
    ? t("sidebar.summary.mobile")
    : t("sidebar.summary.desktop");
  return `
    <aside class="sidebar shell-panel ${state.mobileTab === "projects" ? "mobile-visible" : ""}">
      <section class="shell-subpanel sidebar-hero">
        <div class="panel-headline sidebar-head">
          <div>
            <p class="eyebrow">${escapeHtml(t("sidebar.eyebrow"))}</p>
            <h2>${escapeHtml(t("sidebar.title"))}</h2>
            <p class="subtle">${escapeHtml(sidebarSummary)}</p>
          </div>
          <button class="primary-button small-button" data-action="focus-new-session">${escapeHtml(t("sidebar.newSession"))}</button>
        </div>
        <div class="sidebar-hero-meta">
          ${syncStatusBadge()}
          <span class="badge soft">${escapeHtml(t("sidebar.countSummary", { shown: formatCount(filteredSessions().length), total: formatCount(state.sessions.length) }))}</span>
        </div>
      </section>

      ${renderSidebarFilters()}

      <section class="composer-card shell-subpanel sidebar-new-session ${state.newSessionExpanded ? "" : "collapsed"}">
        <div class="card-head">
          <p class="eyebrow">${escapeHtml(t("newSession.eyebrow"))}</p>
          <h3>${escapeHtml(t("newSession.title"))}</h3>
          <p class="subtle">${escapeHtml(isMobileShellClient() ? t("newSession.subtitle.mobile") : t("newSession.subtitle.desktop"))}</p>
        </div>
        <form id="new-session-form" class="composer-form">
          ${renderNewSessionWorkspaceField()}
          <label>
            <span>${escapeHtml(t("newSession.initialPromptLabel"))}</span>
            <textarea name="prompt" placeholder="${escapeHtml(t("newSession.initialPromptPlaceholder"))}">${escapeHtml(state.newSessionPrompt)}</textarea>
          </label>
          <div class="composer-actions">
            <button class="ghost-button" type="button" data-action="cancel-new-session">${escapeHtml(t("newSession.collapse"))}</button>
            <button class="primary-button" type="submit" ${state.busy ? "disabled" : ""}>${escapeHtml(state.busy ? t("newSession.creating") : t("newSession.createAndRun"))}</button>
          </div>
        </form>
      </section>

      <div class="project-tree">
        ${groups
          .map((group) => {
            const expanded = isWorkspaceExpanded(group.workspace);
            const hasSelectedSession = group.sessions.some((session) => session.id === state.selectedSessionId);
            return `
              <section class="project-group ${hasSelectedSession ? "current" : ""}">
                <div class="project-group-head">
                  <button class="project-toggle" data-action="toggle-workspace" data-workspace-path="${escapeHtml(group.workspace.path)}">
                    <div class="project-copy">
                      <strong>${escapeHtml(group.workspace.name)}</strong>
                      <span>${escapeHtml(group.workspace.path)}</span>
                    </div>
                    <div class="project-meta">
                      <span>${escapeHtml(formatProjectSessionCount(group.sessions.length, group.totalSessions))}</span>
                      <span>${group.sessions[0] ? escapeHtml(formatRelative(group.sessions[0].updated_at)) : escapeHtml(t("project.noUpdates"))}</span>
                    </div>
                  </button>
                  <button class="ghost-button small-button" data-action="prepare-new-session" data-workspace-path="${escapeHtml(group.workspace.path)}">${escapeHtml(t("project.new"))}</button>
                </div>
                <div class="thread-list ${expanded ? "" : "collapsed"}">
                  ${
                    group.sessions.length
                      ? group.sessions
                          .map(
                            (session) => `
                              <article class="thread-card ${session.id === state.selectedSessionId ? "active" : ""} ${session.pinned ? "pinned" : ""} ${sessionFxClass(session.id, "focus")} ${sessionFxClass(session.id, "pin")}">
                                <div class="thread-card-shell">
                                  <div class="thread-card-topline">
                                    <div class="thread-card-badges">
                                      ${session.pinned ? `<span class="badge accent">${escapeHtml(t("session.pinned"))}</span>` : ""}
                                      ${statusBadge(session.status)}
                                    </div>
                                    <span class="thread-node-meta">${escapeHtml(formatRelative(session.updated_at))}</span>
                                  </div>
                                  <button class="thread-card-main" data-session-id="${escapeHtml(session.id)}">
                                    <strong>${escapeHtml(session.title || t("session.unnamed"))}</strong>
                                    <div class="thread-node-row">
                                      <span class="thread-node-meta">${escapeHtml(basename(session.cwd) || t("session.projectUnknown"))}</span>
                                      ${session.branch_name ? `<span class="thread-node-meta">${escapeHtml(t("session.branch", { branch: session.branch_name }))}</span>` : ""}
                                      <span class="thread-node-meta">${escapeHtml(session.model || t("common.defaultModel"))}</span>
                                    </div>
                                    <p class="thread-card-summary">${escapeHtml(truncateText(sessionLatestPrompt(session) || sessionFinalReply(session) || session.cwd, 120))}</p>
                                  </button>
                                  <div class="thread-card-actions-row">
                                    <button class="primary-button small-button" type="button" data-action="continue-session" data-session-id="${escapeHtml(session.id)}">${escapeHtml(t("session.quickContinue"))}</button>
                                    <button class="ghost-button small-button" type="button" data-action="toggle-session-pin" data-session-id="${escapeHtml(session.id)}" data-pinned="${session.pinned ? "true" : "false"}">${escapeHtml(session.pinned ? t("session.unpin") : t("session.pin"))}</button>
                                    <button
                                      class="ghost-button small-button thread-card-menu-toggle ${state.openSessionMenuId === session.id ? "active" : ""}"
                                      type="button"
                                      data-action="toggle-session-menu"
                                      data-session-id="${escapeHtml(session.id)}"
                                      aria-expanded="${state.openSessionMenuId === session.id ? "true" : "false"}"
                                    >
                                      ${escapeHtml(t("session.more"))}
                                    </button>
                                  </div>
                                  <div class="thread-card-menu ${state.openSessionMenuId === session.id ? "" : "collapsed"}">
                                    ${renderTerminalAction(session)}
                                    <button class="ghost-button small-button" data-action="rename-session" data-session-id="${escapeHtml(session.id)}">${escapeHtml(t("session.rename"))}</button>
                                    <button class="ghost-button small-button danger-button" data-action="delete-session" data-session-id="${escapeHtml(session.id)}" ${session.busy ? "disabled" : ""}>${escapeHtml(t("session.delete"))}</button>
                                  </div>
                                </div>
                              </article>
                            `,
                          )
                          .join("")
                      : `<div class="thread-empty">${escapeHtml(t("workspace.empty"))}</div>`
                  }
                </div>
              </section>
            `;
          })
          .join("")}
        ${groups.length === 0 ? `<div class="empty-panel">${escapeHtml(t("workspace.noManaged"))}</div>` : ""}
      </div>
    </aside>
  `;
}

function renderMessages() {
  if (!state.selectedSessionId) {
    return `<div class="empty-panel tall">${escapeHtml(t("messages.emptySelect"))}</div>`;
  }
  if (!state.messages.length) {
    return `<div class="empty-panel tall">${escapeHtml(t("messages.emptyNoMessages"))}</div>`;
  }
  return `
    <div class="message-list">
      ${state.messages
        .map(
          (message) => `
            <article class="message ${message.role}">
              <div class="message-meta">
                <span>${escapeHtml(message.role === "assistant" ? "Codex" : t("common.you"))}</span>
                <span>${escapeHtml(formatTime(message.created_at))}</span>
              </div>
              <pre>${escapeHtml(message.text)}</pre>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderEventPanel() {
  const run = selectedActiveRun();
  const highlights = recentRunHighlights(run, state.liveEvents);
  return `
    <section class="run-summary ${state.runPanelExpanded ? "expanded" : "collapsed"}">
      <div class="panel-headline event-head">
        <div>
          <p class="eyebrow">${escapeHtml(t("run.eyebrow"))}</p>
          <h3>${escapeHtml(run ? run.id : t("run.idle"))}</h3>
        </div>
        <div class="event-head-right">
          ${run && run.status !== "completed" ? statusBadge(run.status) : ""}
          ${run && (run.status === "queued" || run.status === "running") ? `<button class="ghost-button small-button" data-action="cancel-run" data-run-id="${escapeHtml(run.id)}">${escapeHtml(t("run.cancel"))}</button>` : ""}
          <button class="ghost-button small-button" type="button" data-action="toggle-run-panel">${escapeHtml(state.runPanelExpanded ? t("run.collapse") : t("run.expand"))}</button>
        </div>
      </div>
      <div class="event-log run-highlights ${state.runPanelExpanded ? "" : "collapsed"}">
        ${
          highlights.length
            ? highlights
                .map(
                  (item) => `
                    <div class="event-row ${escapeHtml(item.tone || "muted")}">
                      <div class="event-row-head">
                        <span class="event-type">${escapeHtml(item.title)}</span>
                      </div>
                      <p>${escapeHtml(item.detail)}</p>
                    </div>
                  `,
                )
                .join("")
            : `<div class="empty-panel compact">${escapeHtml(t("run.noInfo"))}</div>`
        }
      </div>
    </section>
  `;
}

function renderComposer() {
  const session = selectedSession();
  return `
    <form id="resume-form" class="composer-form conversation-compose">
        <label>
          <span>${escapeHtml(t("composer.label"))}</span>
          <textarea name="prompt" placeholder="${escapeHtml(t("composer.placeholder"))}" ${session ? "" : "disabled"}>${escapeHtml(state.composePrompt)}</textarea>
        </label>
        <div class="composer-actions">
          <button class="primary-button" type="submit" ${state.busy || !session || session.busy ? "disabled" : ""}>
            ${escapeHtml(state.busy ? t("composer.sending") : t("composer.submit"))}
          </button>
        </div>
      </form>
  `;
}

function renderCurrentSessionPane() {
  const session = selectedSession();
  const status = session?.status;
  const showSessionStatus = status && status !== "ready";
  const latestRun = session?.latest_run || selectedActiveRun();
  const projectMeta = session
    ? [basename(session.cwd), session.model, session.branch_name ? t("session.branch", { branch: session.branch_name }) : ""].filter(Boolean).join(" · ")
    : t("current.selectHint");
  return `
    <section class="content shell-panel ${state.mobileTab === "session" ? "mobile-visible" : ""} ${session ? sessionFxClass(session.id, "focus") : ""} ${session ? sessionFxClass(session.id, "pin") : ""}">
      <header class="topbar panel-headline shell-subpanel current-hero">
        <div>
          <p class="eyebrow">${escapeHtml(t("current.eyebrow"))}</p>
          <h1>${escapeHtml(session?.title || t("current.title"))}</h1>
          <p class="subtle">${escapeHtml(projectMeta)}</p>
          ${session ? `<div class="current-live-row">${syncStatusBadge()} ${showSessionStatus ? statusBadge(status) : ""} ${session.pinned ? `<span class="badge accent">${escapeHtml(t("session.pinned"))}</span>` : ""}</div>` : ""}
          ${session ? `<p class="current-path">${escapeHtml(session.cwd)}</p>` : ""}
          ${session ? `<p class="session-id-row">${escapeHtml(t("current.sessionId"))}: <code>${escapeHtml(session.codex_thread_id || session.id)}</code></p>` : ""}
        </div>
        ${
          session
            ? `
              <div class="topbar-actions">
                <button class="ghost-button small-button" type="button" data-action="toggle-session-pin" data-session-id="${escapeHtml(session.id)}" data-pinned="${session.pinned ? "true" : "false"}">${escapeHtml(session.pinned ? t("session.unpin") : t("session.pin"))}</button>
                <button class="ghost-button small-button" data-action="rename-session" data-session-id="${escapeHtml(session.id)}">${escapeHtml(t("session.rename"))}</button>
                ${renderTerminalAction(session)}
                <button class="ghost-button small-button danger-button" data-action="delete-session" data-session-id="${escapeHtml(session.id)}" ${session.busy ? "disabled" : ""}>${escapeHtml(t("session.delete"))}</button>
              </div>
            `
            : ""
        }
	      </header>

        ${
          session
            ? `
              <section class="session-context-grid">
                <article class="status-card">
                  <span>${escapeHtml(t("current.repo"))}</span>
                  <strong>${escapeHtml(basename(session.cwd) || session.cwd)}</strong>
                </article>
                <article class="status-card">
                  <span>${escapeHtml(t("current.branch"))}</span>
                  <strong>${escapeHtml(session.branch_name || t("current.unrecognized"))}</strong>
                </article>
                <article class="status-card">
                  <span>${escapeHtml(t("current.status"))}</span>
                  <strong>${escapeHtml(sessionStatusLabel(session.status))}</strong>
                </article>
                <article class="status-card">
                  <span>${escapeHtml(t("current.sync"))}</span>
                  <strong>${escapeHtml(syncStatusMeta().label)}</strong>
                </article>
                <article class="status-card">
                  <span>${escapeHtml(t("current.latestRun"))}</span>
                  <strong>${escapeHtml(latestRun ? `${sessionStatusLabel(latestRun.status)} · ${formatRelative(latestRun.completed_at || latestRun.started_at || latestRun.created_at)}` : t("current.noneYet"))}</strong>
                </article>
                <article class="status-card session-context-wide">
                  <span>${escapeHtml(t("current.latestPrompt"))}</span>
                  <strong>${escapeHtml(sessionLatestPrompt(session) || t("current.noResumePrompt"))}</strong>
                </article>
                <article class="status-card session-context-wide">
                  <span>${escapeHtml(t("current.lastReply"))}</span>
                  <strong>${escapeHtml(sessionFinalReply(session) || t("current.noReply"))}</strong>
                </article>
                <article class="status-card session-context-wide">
                  <span>${escapeHtml(t("current.verification"))}</span>
                  <strong>${escapeHtml(sessionVerificationLabel(session))}</strong>
                </article>
              </section>
            `
            : ""
        }

	      <section class="messages-panel shell-subpanel conversation-panel">
        <div class="panel-headline">
          <div>
            <p class="eyebrow">${escapeHtml(t("conversation.eyebrow"))}</p>
            <h3>${escapeHtml(t("conversation.title"))}</h3>
          </div>
        </div>
        ${session ? renderEventPanel() : ""}
        ${renderMessages()}
        ${session ? renderComposer() : ""}
      </section>
    </section>
  `;
}

function renderSettingsPane() {
  return `
    <section class="settings-pane shell-panel ${state.mobileTab === "settings" ? "mobile-visible" : ""}">
      <header class="topbar panel-headline">
        <div>
          <p class="eyebrow">${escapeHtml(t("settings.eyebrow"))}</p>
          <h1>${escapeHtml(t("settings.title"))}</h1>
          <p class="subtle">${escapeHtml(t("settings.subtitle"))}</p>
        </div>
        <div class="topbar-actions">
          ${isMobileShellClient() ? `<button class="ghost-button" data-action="set-mobile-tab" data-tab="inbox">${escapeHtml(t("mobile.back"))}</button>` : ""}
          <button class="ghost-button" data-action="logout">${escapeHtml(t("settings.logout"))}</button>
        </div>
      </header>
      ${renderSettingsSections()}
    </section>
  `;
}

function renderApp() {
  document.getElementById("app").innerHTML = isMobileShellClient()
    ? renderMobileApp()
    : `
      <main class="screen workspace-shell">
        <div class="workspace-layout">
          ${renderSidebar()}
          ${renderCurrentSessionPane()}
          ${renderSettingsPane()}
        </div>
        <div class="mobile-tabs">
          <button class="mobile-tab-button ${state.mobileTab === "projects" ? "active" : ""}" data-action="set-mobile-tab" data-tab="projects">${escapeHtml(t("tabs.projects"))}</button>
          <button class="mobile-tab-button ${state.mobileTab === "session" ? "active" : ""}" data-action="set-mobile-tab" data-tab="session">${escapeHtml(t("tabs.session"))}</button>
          <button class="mobile-tab-button ${state.mobileTab === "settings" ? "active" : ""}" data-action="set-mobile-tab" data-tab="settings">${escapeHtml(t("tabs.settings"))}</button>
        </div>
      </main>
    `;

  document.querySelectorAll(".thread-card-main[data-session-id]").forEach((element) => {
    element.addEventListener("click", async () => {
      const sessionId = element.getAttribute("data-session-id");
      if (sessionId) {
        state.mobileTab = isMobileShellClient() ? "detail" : "session";
        await selectSession(sessionId);
      }
    });
  });

  document.querySelectorAll(".mobile-session-main[data-session-id]").forEach((element) => {
    element.addEventListener("click", async () => {
      const sessionId = element.getAttribute("data-session-id");
      if (sessionId) {
        state.mobileTab = "detail";
        render();
        await selectSession(sessionId);
      }
    });
  });

  document.querySelectorAll("[data-action='focus-new-session']").forEach((element) => {
    element.addEventListener("click", () => {
      state.newSessionExpanded = true;
      state.mobileTab = isMobileShellClient() ? "inbox" : "projects";
      render();
      document.querySelector("#new-session-form textarea")?.focus();
    });
  });

  document.querySelectorAll("[data-action='prepare-new-session']").forEach((element) => {
    element.addEventListener("click", () => {
      const workspacePath = element.getAttribute("data-workspace-path");
      if (workspacePath) {
        state.newSessionCwd = workspacePath;
        state.expandedWorkspacePaths[workspacePath] = true;
      }
      state.newSessionExpanded = true;
      state.mobileTab = isMobileShellClient() ? "inbox" : "projects";
      render();
    });
  });

  document.querySelectorAll("[data-action='cancel-new-session']").forEach((element) => {
    element.addEventListener("click", () => {
      state.newSessionExpanded = false;
      render();
    });
  });

  document.querySelectorAll("[data-action='continue-session']").forEach((element) => {
    element.addEventListener("click", async () => {
      const sessionId = element.getAttribute("data-session-id");
      if (!sessionId) {
        return;
      }
      state.openSessionMenuId = null;
      state.mobileTab = isMobileShellClient() ? "detail" : "session";
      state.shouldScrollSessionBottom = true;
      render();
      await selectSession(sessionId);
      render();
      document.querySelector("#resume-form textarea")?.focus();
    });
  });

  document.querySelectorAll("[data-action='toggle-session-menu']").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const sessionId = element.getAttribute("data-session-id");
      state.openSessionMenuId = state.openSessionMenuId === sessionId ? null : sessionId;
      render();
    });
  });

  document.querySelectorAll("[data-action='rename-session']").forEach((element) => {
    element.addEventListener("click", async () => {
      const sessionId = element.getAttribute("data-session-id");
      const session = state.sessions.find((item) => item.id === sessionId);
      if (!sessionId || !session) {
        return;
      }
      const nextTitle = window.prompt(t("prompt.rename"), session.title || "");
      if (nextTitle === null) {
        return;
      }
      const title = String(nextTitle || "").trim();
      if (!title) {
        window.alert(t("prompt.renameEmpty"));
        return;
      }
      try {
        state.openSessionMenuId = null;
        await api(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          body: JSON.stringify({ title }),
        });
        await refreshSessions();
        await syncSelectionAfterSessionsRefresh(sessionId);
      } catch (error) {
        window.alert(error.message || t("prompt.renameFailed"));
      }
    });
  });

  document.querySelectorAll("[data-action='delete-session']").forEach((element) => {
    element.addEventListener("click", async () => {
      const sessionId = element.getAttribute("data-session-id");
      const session = state.sessions.find((item) => item.id === sessionId);
      if (!sessionId || !session) {
        return;
      }
      const confirmed = window.confirm(t("prompt.deleteConfirm", { name: session.title || sessionId }));
      if (!confirmed) {
        return;
      }
      try {
        state.openSessionMenuId = null;
        await api(`/api/sessions/${sessionId}`, { method: "DELETE" });
        await refreshSessions();
        await syncSelectionAfterSessionsRefresh();
      } catch (error) {
        window.alert(error.message || t("prompt.deleteFailed"));
      }
    });
  });

  document.querySelectorAll("[data-action='move-session-up'], [data-action='move-session-down']").forEach((element) => {
    element.addEventListener("click", async () => {
      const sessionId = element.getAttribute("data-session-id");
      const workspacePath = element.getAttribute("data-workspace-path");
      const direction = element.getAttribute("data-action") === "move-session-up" ? -1 : 1;
      if (!sessionId || !workspacePath) {
        return;
      }
      const sessions = sessionsForWorkspacePath(workspacePath);
      const index = sessions.findIndex((item) => item.id === sessionId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= sessions.length) {
        return;
      }
      const reordered = [...sessions];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      try {
        state.openSessionMenuId = sessionId;
        await api("/api/sessions/reorder", {
          method: "POST",
          body: JSON.stringify({ session_ids: reordered.map((item) => item.id) }),
        });
        await refreshSessions();
        await syncSelectionAfterSessionsRefresh(state.selectedSessionId);
      } catch (error) {
        window.alert(error.message || t("prompt.reorderFailed"));
      }
    });
  });

  document.querySelectorAll("[data-action='open-terminal']").forEach((element) => {
    element.addEventListener("click", async () => {
      const sessionId = element.getAttribute("data-session-id");
      if (!sessionId) {
        return;
      }
      try {
        state.openSessionMenuId = null;
        await api(`/api/sessions/${sessionId}/open-terminal`, { method: "POST", body: "{}" });
      } catch (error) {
        window.alert(error.message || t("prompt.openTerminalFailed"));
      }
    });
  });

  document.querySelectorAll("[data-action='toggle-session-pin']").forEach((element) => {
    element.addEventListener("click", async () => {
      const sessionId = element.getAttribute("data-session-id");
      if (!sessionId) {
        return;
      }
      const nextPinned = element.getAttribute("data-pinned") !== "true";
      try {
        state.openSessionMenuId = null;
        await api(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          body: JSON.stringify({ pinned: nextPinned }),
        });
        triggerSessionFx(sessionId, "pin");
        await refreshSessions();
        await syncSelectionAfterSessionsRefresh(state.selectedSessionId || sessionId);
      } catch (error) {
        window.alert(error.message || t("prompt.pinFailed"));
      }
    });
  });

  document.querySelectorAll("[data-action='toggle-workspace']").forEach((element) => {
    element.addEventListener("click", () => {
      const workspacePath = element.getAttribute("data-workspace-path");
      if (!workspacePath) {
        return;
      }
      state.expandedWorkspacePaths[workspacePath] = !isWorkspaceExpanded({ path: workspacePath, pinned: false });
      render();
    });
  });

  document.querySelectorAll("[data-action='set-session-filter']").forEach((element) => {
    element.addEventListener("click", () => {
      state.sessionFilter = element.getAttribute("data-filter") || "all";
      render();
    });
  });

  document.getElementById("session-search-input")?.addEventListener("input", (event) => {
    state.sessionSearchQuery = event.target.value;
    render();
  });

  document.querySelectorAll("[data-action='set-mobile-tab']").forEach((element) => {
    element.addEventListener("click", () => {
      state.mobileTab = element.getAttribute("data-tab") || "inbox";
      if (state.mobileTab === "detail" || (!isMobileShellClient() && state.mobileTab === "session")) {
        state.shouldScrollSessionBottom = true;
      }
      render();
    });
  });

  document.querySelectorAll("[data-action='toggle-run-panel']").forEach((element) => {
    element.addEventListener("click", () => {
      state.runPanelExpanded = !state.runPanelExpanded;
      render();
    });
  });

  document.querySelectorAll("[data-action='cancel-run']").forEach((element) => {
    element.addEventListener("click", async () => {
      const runId = element.getAttribute("data-run-id");
      if (!runId) {
        return;
      }
      try {
        await api(`/api/runs/${runId}/cancel`, { method: "POST", body: "{}" });
      } catch (error) {
        window.alert(error.message || t("prompt.cancelFailed"));
      }
    });
  });

  document.querySelectorAll("[data-action='clear-password-form']").forEach((element) => {
    element.addEventListener("click", () => {
      state.passwordCurrent = "";
      state.passwordNext = "";
      state.passwordConfirm = "";
      render();
    });
  });

  document.querySelectorAll("[data-action='logout']").forEach((element) => {
    element.addEventListener("click", async () => {
      resetSessionTransport();
      clearSessionFx();
      await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => {});
      Object.assign(state, {
        booting: false,
        user: null,
        workspaces: [],
        sessions: [],
        selectedSessionId: null,
        messages: [],
        runs: [],
        liveEvents: [],
        system: null,
        ws: null,
        wsConnected: false,
        wsReconnectAttempts: 0,
        wsReconnectTimer: null,
        wsSessionId: null,
        sessionPollTimer: null,
      });
      render();
    });
  });

  const newSessionForm = document.getElementById("new-session-form");
  if (newSessionForm) {
    newSessionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.busy = true;
      render();
      try {
        state.newSessionCwd = String(form.get("cwd") || "").trim();
        const data = await api("/api/sessions", {
          method: "POST",
          body: JSON.stringify({
            cwd: state.newSessionCwd,
            prompt: String(form.get("prompt") || ""),
          }),
        });
        state.newSessionPrompt = "";
        state.newSessionExpanded = false;
        state.mobileTab = isMobileShellClient() ? "detail" : "session";
        state.shouldScrollSessionBottom = true;
        await refreshSessions();
        await selectSession(data.session.id);
      } catch (error) {
        window.alert(error.message || t("prompt.submitFailed"));
      } finally {
        state.busy = false;
        render();
      }
    });

    newSessionForm.querySelector("[name='cwd']")?.addEventListener("input", (event) => {
      state.newSessionCwd = event.target.value;
    });
    newSessionForm.querySelector("[name='prompt']")?.addEventListener("input", (event) => {
      state.newSessionPrompt = event.target.value;
    });
  }

  const resumeForm = document.getElementById("resume-form");
  if (resumeForm) {
    resumeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const session = selectedSession();
      if (!session) {
        return;
      }
      const form = new FormData(event.currentTarget);
      state.busy = true;
      render();
      try {
        await api(`/api/sessions/${session.id}/runs`, {
          method: "POST",
          body: JSON.stringify({ prompt: String(form.get("prompt") || "") }),
        });
        state.composePrompt = "";
        await refreshSessionState(session.id);
      } catch (error) {
        window.alert(error.message || t("prompt.continueFailed"));
      } finally {
        state.busy = false;
        render();
      }
    });

    resumeForm.querySelector("[name='prompt']")?.addEventListener("input", (event) => {
      state.composePrompt = event.target.value;
    });
  }

  const settingsForm = document.getElementById("settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.settingsSaving = true;
      render();
      try {
        const gitWriteEnabled = Boolean(settingsForm.querySelector("[name='git_write_enabled']")?.checked);
        const data = await api("/api/system/settings", {
          method: "POST",
          body: JSON.stringify({
            model: String(form.get("settings_model") || "").trim(),
            reasoning_effort: state.settingsEffort,
            ui_language: normalizeUiLanguage(String(form.get("ui_language") || state.settingsUiLanguage)),
            terminal_app: String(form.get("terminal_app") || "").trim().toLowerCase(),
            sandbox_mode: String(form.get("sandbox_mode") || "").trim().toLowerCase(),
            approval_policy: String(form.get("approval_policy") || "").trim().toLowerCase(),
            git_write_enabled: gitWriteEnabled,
            git_write_sandbox_mode: String(form.get("git_write_sandbox_mode") || "").trim().toLowerCase(),
            git_write_approval_policy: String(form.get("git_write_approval_policy") || "").trim().toLowerCase(),
          }),
        });
        state.system = data.status;
        syncSettingsState();
      } catch (error) {
        window.alert(error.message || t("prompt.saveSettingsFailed"));
      } finally {
        state.settingsSaving = false;
        render();
      }
    });

    settingsForm.querySelector("[name='settings_model']")?.addEventListener("input", (event) => {
      state.settingsModel = event.target.value;
    });
    settingsForm.querySelector("[name='ui_language']")?.addEventListener("change", (event) => {
      state.settingsUiLanguage = normalizeUiLanguage(event.target.value || "zh-CN");
      state.uiLanguage = state.settingsUiLanguage;
      render();
    });
    settingsForm.querySelector("[name='terminal_app']")?.addEventListener("change", (event) => {
      state.settingsTerminalApp = String(event.target.value || "terminal").toLowerCase();
    });
    settingsForm.querySelector("[name='sandbox_mode']")?.addEventListener("change", (event) => {
      state.settingsSandboxMode = String(event.target.value || "workspace-write").toLowerCase();
    });
    settingsForm.querySelector("[name='approval_policy']")?.addEventListener("change", (event) => {
      state.settingsApprovalPolicy = String(event.target.value || "never").toLowerCase();
    });
    settingsForm.querySelector("[name='git_write_enabled']")?.addEventListener("change", (event) => {
      state.settingsGitWriteEnabled = Boolean(event.target.checked);
      render();
    });
    settingsForm.querySelector("[name='git_write_sandbox_mode']")?.addEventListener("change", (event) => {
      state.settingsGitWriteSandboxMode = String(event.target.value || "danger-full-access").toLowerCase();
    });
    settingsForm.querySelector("[name='git_write_approval_policy']")?.addEventListener("change", (event) => {
      state.settingsGitWriteApprovalPolicy = String(event.target.value || "on-request").toLowerCase();
    });
  }

  document.querySelectorAll("[data-action='set-settings-effort']").forEach((element) => {
    element.addEventListener("click", () => {
      state.settingsEffort = element.getAttribute("data-effort") || "medium";
      render();
    });
  });

  const passwordForm = document.getElementById("password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.passwordSaving = true;
      render();
      try {
        await api("/api/auth/password", {
          method: "POST",
          body: JSON.stringify({
            current_password: String(form.get("current_password") || ""),
            new_password: String(form.get("new_password") || ""),
            confirm_password: String(form.get("confirm_password") || ""),
          }),
        });
        state.passwordCurrent = "";
        state.passwordNext = "";
        state.passwordConfirm = "";
        window.alert(t("prompt.passwordUpdated"));
      } catch (error) {
        window.alert(error.message || t("prompt.passwordChangeFailed"));
      } finally {
        state.passwordSaving = false;
        render();
      }
    });
  }
}

function render() {
  syncRuntimeDecorations();
  applyUiLanguage();
  if (state.booting) {
    document.getElementById("app").innerHTML = `<main class="screen loading-screen"><div class="loading-card">${escapeHtml(t("loading.message"))}</div></main>`;
    return;
  }
  if (!state.user) {
    renderLogin();
    return;
  }
  renderApp();
  if (state.shouldScrollSessionBottom && (state.mobileTab === "detail" || state.mobileTab === "session")) {
    state.shouldScrollSessionBottom = false;
    scrollCurrentSessionToBottom();
  }
}

async function refreshProjects() {
  const data = await api("/api/projects");
  state.workspaces = data.items;
}

async function refreshSessions() {
  const data = await api("/api/sessions");
  state.sessions = data.items;
  if (!state.selectedSessionId && state.sessions.length > 0) {
    state.selectedSessionId = state.sessions[0].id;
  }
  if (state.selectedSessionId && !state.sessions.find((item) => item.id === state.selectedSessionId)) {
    state.selectedSessionId = state.sessions[0]?.id || null;
  }
}

async function syncSelectionAfterSessionsRefresh(preferredSessionId = null) {
  if (preferredSessionId && state.sessions.find((item) => item.id === preferredSessionId)) {
    if (state.selectedSessionId !== preferredSessionId) {
      await selectSession(preferredSessionId);
      return;
    }
    await refreshSessionState(preferredSessionId);
    render();
    return;
  }
  if (state.selectedSessionId && state.sessions.find((item) => item.id === state.selectedSessionId)) {
    await refreshSessionState(state.selectedSessionId);
    render();
    return;
  }
  resetSessionTransport();
  state.messages = [];
  state.runs = [];
  state.liveEvents = [];
  if (state.selectedSessionId) {
    await selectSession(state.selectedSessionId);
  } else {
    render();
  }
}

async function refreshSessionState(sessionId, options = {}) {
  const attempts = Math.max(1, Number(options.attempts || 1));
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 250));
  const expectedAssistantText = String(options.expectedAssistantText || "").trim();
  let sessionData = null;
  let messagesData = null;
  let runsData = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    [sessionData, messagesData, runsData] = await Promise.all([
      api(`/api/sessions/${sessionId}`),
      api(`/api/sessions/${sessionId}/messages`),
      api(`/api/sessions/${sessionId}/runs`),
    ]);
    if (!expectedAssistantText || hasMessage("assistant", expectedAssistantText, messagesData.items)) {
      break;
    }
    if (attempt < attempts - 1) {
      await sleep(retryDelayMs);
    }
  }

  if (sessionData?.session) {
    const index = state.sessions.findIndex((item) => item.id === sessionData.session.id);
    if (index >= 0) {
      state.sessions[index] = sessionData.session;
    } else {
      state.sessions.unshift(sessionData.session);
    }
  }
  state.messages = messagesData?.items || [];
  state.runs = runsData?.items || [];
  if (options.finalRun) {
    ensureOptimisticFinalMessage(options.finalRun);
  }
}

function clearSessionPoll() {
  if (state.sessionPollTimer) {
    window.clearTimeout(state.sessionPollTimer);
    state.sessionPollTimer = null;
  }
}

function clearWebSocketReconnect() {
  if (state.wsReconnectTimer) {
    window.clearTimeout(state.wsReconnectTimer);
    state.wsReconnectTimer = null;
  }
}

function resetSessionTransport() {
  clearSessionPoll();
  clearWebSocketReconnect();
  state.wsSessionId = null;
  state.wsConnected = false;
  const activeSocket = state.ws;
  state.ws = null;
  activeSocket?.close();
}

function scheduleSessionPoll() {
  clearSessionPoll();
  if (!state.user || !state.selectedSessionId) {
    return;
  }
  const session = selectedSession();
  const delay = session?.busy || !state.wsConnected ? 3500 : isMobileShellClient() ? 12000 : 18000;
  state.sessionPollTimer = window.setTimeout(async () => {
    if (!state.user || !state.selectedSessionId) {
      return;
    }
    try {
      await refreshSessions();
      await refreshSessionState(state.selectedSessionId);
    } catch {}
    render();
    scheduleSessionPoll();
  }, delay);
}

function scheduleWebSocketReconnect(sessionId) {
  clearWebSocketReconnect();
  if (!state.user || !sessionId || state.wsSessionId !== sessionId) {
    return;
  }
  const delay = Math.min(12000, 1200 * Math.max(1, state.wsReconnectAttempts + 1));
  state.wsReconnectTimer = window.setTimeout(() => {
    if (!state.user || state.wsSessionId !== sessionId || state.wsConnected) {
      return;
    }
    bindWebSocket(sessionId);
  }, delay);
}

async function refreshSelectedSessionTransport(forceReconnect = false) {
  if (!state.user || !state.selectedSessionId) {
    return;
  }
  try {
    await refreshSessions();
    await refreshSessionState(state.selectedSessionId);
  } catch {}
  if (forceReconnect || !state.wsConnected) {
    bindWebSocket(state.selectedSessionId);
  } else {
    scheduleSessionPoll();
  }
  render();
}

function bindWebSocket(sessionId) {
  clearWebSocketReconnect();
  const previousSocket = state.ws;
  state.wsSessionId = sessionId;
  state.ws = null;
  previousSocket?.close();
  if (!sessionId) {
    state.wsConnected = false;
    return;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${window.location.host}/api/sessions/${sessionId}/events`);
  state.ws = ws;
  ws.addEventListener("open", () => {
    if (state.ws !== ws) {
      return;
    }
    state.wsConnected = true;
    state.wsReconnectAttempts = 0;
    clearWebSocketReconnect();
    scheduleSessionPoll();
    render();
  });
  ws.addEventListener("close", () => {
    if (state.ws !== ws) {
      return;
    }
    state.wsConnected = false;
    state.wsReconnectAttempts += 1;
    scheduleSessionPoll();
    scheduleWebSocketReconnect(sessionId);
    render();
  });
  ws.addEventListener("message", async (event) => {
    if (state.ws !== ws) {
      return;
    }
    const payload = JSON.parse(event.data);
    if (payload.event === "session.snapshot") {
      state.runs = payload.data.runs || [];
      state.liveEvents = payload.data.events || [];
      if (payload.data.session) {
        state.sessions = state.sessions.map((item) => (item.id === payload.data.session.id ? payload.data.session : item));
      }
      scheduleSessionPoll();
      render();
      return;
    }
    if (payload.event === "run.event" || payload.event === "run.log") {
      state.liveEvents = [...state.liveEvents, payload.data.event].slice(-200);
      scheduleSessionPoll();
      render();
      return;
    }
    if (payload.event === "run.started" || payload.event === "run.completed" || payload.event === "run.failed" || payload.event === "run.cancelled" || payload.event === "run.queued") {
      const incomingSession = payload.data.session;
      const incomingRun = payload.data.run;
      if (incomingSession) {
        const index = state.sessions.findIndex((item) => item.id === incomingSession.id);
        if (index >= 0) {
          state.sessions[index] = incomingSession;
        } else {
          state.sessions.unshift(incomingSession);
        }
      }
      if (incomingRun) {
        const index = state.runs.findIndex((item) => item.id === incomingRun.id);
        if (index >= 0) {
          state.runs[index] = incomingRun;
        } else {
          state.runs.unshift(incomingRun);
        }
      }
      if (payload.event !== "run.queued" && state.selectedSessionId && incomingSession?.id === state.selectedSessionId) {
        await refreshSessionState(state.selectedSessionId, {
          attempts: payload.event === "run.completed" ? 5 : 1,
          retryDelayMs: 300,
          expectedAssistantText: incomingRun?.final_message || "",
          finalRun: incomingRun,
        });
      }
      scheduleSessionPoll();
      render();
    }
  });
}

async function selectSession(sessionId) {
  const previousSessionId = state.selectedSessionId;
  state.selectedSessionId = sessionId;
  state.openSessionMenuId = null;
  state.composePrompt = "";
  state.runPanelExpanded = false;
  state.shouldScrollSessionBottom = true;
  const current = state.sessions.find((item) => item.id === sessionId);
  if (current?.cwd) {
    state.expandedWorkspacePaths[current.cwd] = true;
  }
  await refreshSessionState(sessionId);
  bindWebSocket(sessionId);
  scheduleSessionPoll();
  if (previousSessionId !== sessionId) {
    triggerSessionFx(sessionId, "focus", 900);
  }
  render();
}

async function bootstrap() {
  state.booting = true;
  render();
  try {
    const me = await api("/api/auth/me");
    state.user = me.user;
    if (isMobileShellClient() && !["inbox", "detail", "settings"].includes(state.mobileTab)) {
      state.mobileTab = "inbox";
    }
    const [system] = await Promise.all([api("/api/system/status"), refreshProjects(), refreshSessions()]);
    state.system = system;
    syncSettingsState();
    state.newSessionCwd = state.newSessionCwd || state.workspaces?.[0]?.path || "";
    if (state.selectedSessionId) {
      await selectSession(state.selectedSessionId);
    }
  } catch {
    state.user = null;
  } finally {
    state.booting = false;
    render();
  }
}

window.addEventListener("focus", () => {
  void refreshSelectedSessionTransport();
});

window.addEventListener("online", () => {
  void refreshSelectedSessionTransport(true);
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    void refreshSelectedSessionTransport(true);
  }
});

bootstrap();
