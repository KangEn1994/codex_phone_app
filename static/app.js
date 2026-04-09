const state = {
  booting: true,
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
  mobileTab: "session",
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
};

function selectedSession() {
  return state.sessions.find((item) => item.id === state.selectedSessionId) || null;
}

function selectedActiveRun() {
  return state.runs.find((run) => run.status === "queued" || run.status === "running") || state.runs[0] || null;
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
  const payload = await response.json().catch(() => ({ ok: false, error: { message: "Invalid JSON response" } }));
  if (!response.ok || !payload.ok) {
    const message = payload?.error?.message || `Request failed: ${response.status}`;
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
    return new Intl.DateTimeFormat("zh-CN", {
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
    return "刚刚";
  }
  if (Math.abs(diffMinutes) < 60) {
    return `${Math.abs(diffMinutes)} 分钟前`;
  }
  const hours = Math.round(Math.abs(diffMinutes) / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }
  return `${Math.round(hours / 24)} 天前`;
}

function reasoningEffortLabel(level) {
  return {
    low: "低",
    medium: "中",
    high: "高",
    xhigh: "超高",
  }[level] || level || "未设置";
}

function terminalAppLabel(value) {
  return {
    terminal: "Terminal",
    iterm: "iTerm",
  }[value] || value || "Terminal";
}

function sandboxModeLabel(value) {
  return {
    "read-only": "只读",
    "workspace-write": "工作区可写",
    "danger-full-access": "完全访问",
  }[value] || value || "工作区可写";
}

function approvalPolicyLabel(value) {
  return {
    untrusted: "仅非信任命令审批",
    "on-request": "按需审批",
    never: "永不审批",
  }[value] || value || "永不审批";
}

function gitWriteEscalationLabel(enabled) {
  return enabled ? "已开启" : "未开启";
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
  const sessionMap = new Map();
  for (const session of state.sessions) {
    const workspace = workspaceForCwd(session.cwd);
    if (!workspace) {
      continue;
    }
    const list = sessionMap.get(workspace.path) || [];
    list.push(session);
    sessionMap.set(workspace.path, list);
  }
  return state.workspaces
    .map((workspace) => ({ workspace, sessions: sessionMap.get(workspace.path) || [] }))
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
  return `<span class="badge ${tones[status] || "muted"}">${escapeHtml(status || "unknown")}</span>`;
}

function syncSettingsState() {
  const settings = state.system?.settings || {};
  state.settingsModel = String(settings.model || state.system?.default_model || "").trim();
  state.settingsEffort = String(settings.reasoning_effort || state.system?.default_reasoning_effort || "medium").trim().toLowerCase() || "medium";
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
      title: "会话已接通",
      detail: payload.thread_id ? `Codex thread: ${payload.thread_id}` : "Codex thread 已创建",
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
      title: "助手产出了一段结果",
      detail: truncateText(text, 160),
    };
  }
  if (event.event_type === "turn.completed") {
    const payload = event.payload?.payload || event.payload || {};
    const tokens = payload?.usage?.output_tokens;
    return {
      tone: "accent",
      title: "本轮执行完成",
      detail: tokens ? `输出 tokens: ${tokens}` : "CLI 已发出完成事件",
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
        title: "运行日志报错",
        detail: line,
      };
    }
    return {
      tone: "muted",
      title: "CLI 日志",
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
    items.push({
      tone: run.status === "failed" ? "danger" : run.status === "cancelled" ? "warn" : run.status === "running" ? "accent" : "soft",
      title: "当前状态",
      detail: `${run.status}${run.started_at ? ` · 启动于 ${formatTime(run.started_at)}` : ""}${run.completed_at ? ` · 结束于 ${formatTime(run.completed_at)}` : ""}`,
    });
    if (run.final_message) {
      items.push({
        tone: "accent",
        title: "最终回复",
        detail: truncateText(run.final_message, 160),
      });
    }
    if (run.status === "failed" && run.stderr_tail) {
      const lastLine = truncateText(run.stderr_tail.split("\n").filter(Boolean).slice(-1)[0] || run.stderr_tail, 160);
      if (lastLine) {
        items.push({
          tone: "danger",
          title: "失败原因",
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

function renderLogin() {
  document.getElementById("app").innerHTML = `
    <main class="screen auth-screen">
      <section class="auth-card">
        <p class="eyebrow">Codex CLI Web Console</p>
        <h1>登录到你的远程会话控制台</h1>
        <p class="subtle">工作台分为项目列表、当前会话、设置三块，交互逻辑参考 old 版。</p>
        <form id="login-form" class="stack">
          <label>
            <span>用户名</span>
            <input name="username" value="admin" autocomplete="username" />
          </label>
          <label>
            <span>密码</span>
            <input name="password" type="password" autocomplete="current-password" />
          </label>
          ${state.loginError ? `<p class="error-text">${escapeHtml(state.loginError)}</p>` : ""}
          <button class="primary-button" type="submit">登录</button>
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
      state.loginError = error.message || "登录失败";
      render();
    }
  });
}

function renderSidebar() {
  const groups = visibleWorkspaceGroups();
  return `
    <aside class="sidebar shell-panel ${state.mobileTab === "projects" ? "mobile-visible" : ""}">
      <div class="panel-headline sidebar-head">
        <div>
          <p class="eyebrow">Projects</p>
          <h2>项目列表</h2>
          <p class="subtle">项目下展示受管会话，每张卡片都可以直接继续或在终端打开。</p>
        </div>
        <button class="ghost-button small-button" data-action="focus-new-session">新会话</button>
      </div>

      <section class="composer-card shell-subpanel sidebar-new-session ${state.newSessionExpanded ? "" : "collapsed"}">
        <div class="card-head">
          <p class="eyebrow">New Session</p>
          <h3>在项目列表里新建</h3>
          <p class="subtle">这里负责选择项目文件夹并输入首条 prompt。</p>
        </div>
        <form id="new-session-form" class="composer-form">
          <label>
            <span>项目文件夹</span>
            <input name="cwd" value="${escapeHtml(state.newSessionCwd)}" placeholder="/Users/you/codex/project" />
          </label>
          <label>
            <span>首条 prompt</span>
            <textarea name="prompt" placeholder="输入第一条消息，创建新的执行会话">${escapeHtml(state.newSessionPrompt)}</textarea>
          </label>
          <div class="composer-actions">
            <button class="ghost-button" type="button" data-action="cancel-new-session">收起</button>
            <button class="primary-button" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "创建中..." : "创建并运行"}</button>
          </div>
        </form>
      </section>

      <div class="project-tree">
        ${groups
          .map((group) => {
            const expanded = isWorkspaceExpanded(group.workspace);
            return `
              <section class="project-group ${group.workspace.path === selectedSession()?.cwd ? "current" : ""}">
                <div class="project-group-head">
                  <button class="project-toggle" data-action="toggle-workspace" data-workspace-path="${escapeHtml(group.workspace.path)}">
                    <div class="project-copy">
                      <strong>${escapeHtml(group.workspace.name)}</strong>
                      <span>${escapeHtml(group.workspace.path)}</span>
                    </div>
                    <div class="project-meta">
                      <span>${group.sessions.length} 条会话</span>
                      <span>${group.sessions[0] ? escapeHtml(formatRelative(group.sessions[0].updated_at)) : "暂无更新"}</span>
                    </div>
                  </button>
                  <button class="ghost-button small-button" data-action="prepare-new-session" data-workspace-path="${escapeHtml(group.workspace.path)}">新建</button>
                </div>
                <div class="thread-list ${expanded ? "" : "collapsed"}">
                  ${
                    group.sessions.length
                      ? group.sessions
                          .map(
                            (session) => `
                              <article class="thread-card ${session.id === state.selectedSessionId ? "active" : ""}">
                                <div class="thread-card-shell">
                                  <div class="thread-card-head">
                                    <button class="thread-card-main" data-session-id="${escapeHtml(session.id)}">
                                      <strong>${escapeHtml(session.title || "未命名会话")}</strong>
                                      <div class="thread-node-row">
                                        <span class="thread-node-meta">ID: ${escapeHtml(session.codex_thread_id || session.id)}</span>
                                      </div>
                                      <div class="thread-node-row">
                                        <span class="thread-node-meta">${escapeHtml(session.model || "默认模型")}</span>
                                        <span class="thread-node-meta">${escapeHtml(formatRelative(session.updated_at))}</span>
                                        ${statusBadge(session.status)}
                                      </div>
                                    </button>
                                    <button
                                      class="ghost-button small-button thread-card-menu-toggle ${state.openSessionMenuId === session.id ? "active" : ""}"
                                      type="button"
                                      data-action="toggle-session-menu"
                                      data-session-id="${escapeHtml(session.id)}"
                                      aria-expanded="${state.openSessionMenuId === session.id ? "true" : "false"}"
                                    >
                                      操作
                                    </button>
                                  </div>
                                  <div class="thread-card-menu ${state.openSessionMenuId === session.id ? "" : "collapsed"}">
                                    <button class="ghost-button small-button" data-action="continue-session" data-session-id="${escapeHtml(session.id)}">继续会话</button>
                                    <button class="ghost-button small-button" data-action="open-terminal" data-session-id="${escapeHtml(session.id)}" ${session.codex_thread_id ? "" : "disabled"}>终端打开</button>
                                    <button class="ghost-button small-button" data-action="rename-session" data-session-id="${escapeHtml(session.id)}">改名</button>
                                    <button class="ghost-button small-button" data-action="move-session-up" data-session-id="${escapeHtml(session.id)}" data-workspace-path="${escapeHtml(group.workspace.path)}" ${group.sessions[0]?.id === session.id ? "disabled" : ""}>上移</button>
                                    <button class="ghost-button small-button" data-action="move-session-down" data-session-id="${escapeHtml(session.id)}" data-workspace-path="${escapeHtml(group.workspace.path)}" ${group.sessions[group.sessions.length - 1]?.id === session.id ? "disabled" : ""}>下移</button>
                                    <button class="ghost-button small-button danger-button" data-action="delete-session" data-session-id="${escapeHtml(session.id)}" ${session.busy ? "disabled" : ""}>删除</button>
                                  </div>
                                </div>
                              </article>
                            `,
                          )
                          .join("")
                      : `<div class="thread-empty">这个项目下暂时还没有会话。</div>`
                  }
                </div>
              </section>
            `;
          })
          .join("")}
        ${groups.length === 0 ? `<div class="empty-panel">还没有受管会话，可以先在这里新建一个。</div>` : ""}
      </div>
    </aside>
  `;
}

function renderMessages() {
  if (!state.selectedSessionId) {
    return `<div class="empty-panel tall">先在左侧项目列表中选择一个会话，或者在那里新建一个。</div>`;
  }
  if (!state.messages.length) {
    return `<div class="empty-panel tall">这个会话还没有可见消息，运行开始后会自动出现。</div>`;
  }
  return `
    <div class="message-list">
      ${state.messages
        .map(
          (message) => `
            <article class="message ${message.role}">
              <div class="message-meta">
                <span>${escapeHtml(message.role === "assistant" ? "Codex" : "You")}</span>
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
          <p class="eyebrow">Run Status</p>
          <h3>${escapeHtml(run ? run.id : "当前空闲")}</h3>
        </div>
        <div class="event-head-right">
          ${run && run.status !== "completed" ? statusBadge(run.status) : ""}
          ${run && (run.status === "queued" || run.status === "running") ? `<button class="ghost-button small-button" data-action="cancel-run" data-run-id="${escapeHtml(run.id)}">取消</button>` : ""}
          <button class="ghost-button small-button" type="button" data-action="toggle-run-panel">${state.runPanelExpanded ? "收起" : "展开"}</button>
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
            : `<div class="empty-panel compact">当前还没有值得展示的运行信息。</div>`
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
          <span>继续当前会话</span>
          <textarea name="prompt" placeholder="继续这个会话，例如：顺便补上测试和回滚方案" ${session ? "" : "disabled"}>${escapeHtml(state.composePrompt)}</textarea>
        </label>
        <div class="composer-actions">
          <button class="primary-button" type="submit" ${state.busy || !session || session.busy ? "disabled" : ""}>
            ${state.busy ? "发送中..." : "发送到当前会话"}
          </button>
        </div>
      </form>
  `;
}

function renderCurrentSessionPane() {
  const session = selectedSession();
  const status = session?.status;
  const showSessionStatus = status && status !== "ready";
  return `
    <section class="content shell-panel ${state.mobileTab === "session" ? "mobile-visible" : ""}">
      <header class="topbar panel-headline">
        <div>
          <p class="eyebrow">Current Session</p>
          <h1>${escapeHtml(session?.title || "当前会话")}</h1>
          <p class="subtle">${escapeHtml(session ? `${basename(session.cwd)} · ${session.model}` : "选择左侧会话，或者先到项目列表里新建一个")}</p>
          ${session ? `<p class="current-path">${escapeHtml(session.cwd)}</p>` : ""}
          ${session ? `<p class="session-id-row">会话 ID: <code>${escapeHtml(session.codex_thread_id || session.id)}</code></p>` : ""}
        </div>
        ${
          session
            ? `
              <div class="topbar-actions">
                <button class="ghost-button small-button" data-action="rename-session" data-session-id="${escapeHtml(session.id)}">改名</button>
                <button class="ghost-button small-button" data-action="open-terminal" data-session-id="${escapeHtml(session.id)}" ${session.codex_thread_id ? "" : "disabled"}>终端打开</button>
                <button class="ghost-button small-button danger-button" data-action="delete-session" data-session-id="${escapeHtml(session.id)}" ${session.busy ? "disabled" : ""}>删除</button>
                ${showSessionStatus ? statusBadge(status) : ""}
              </div>
            `
            : ""
        }
      </header>

      <section class="messages-panel shell-subpanel conversation-panel">
        <div class="panel-headline">
          <div>
            <p class="eyebrow">Conversation</p>
            <h3>历史消息与继续对话</h3>
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
          <p class="eyebrow">Settings</p>
          <h1>设置</h1>
          <p class="subtle">模型名和思考强度统一在这里选择，新建和继续都会使用这里的默认值。</p>
        </div>
        <div class="topbar-actions">
          <button class="ghost-button" data-action="logout">退出</button>
        </div>
      </header>

      <section class="settings-summary-grid">
        <article class="status-card">
          <span>Codex CLI</span>
          <strong>${escapeHtml(state.system?.codex_cli_version || "未检测到")}</strong>
        </article>
        <article class="status-card">
          <span>默认模型</span>
          <strong>${escapeHtml(state.system?.settings?.model || state.system?.default_model || "未配置")}</strong>
        </article>
        <article class="status-card">
          <span>思考强度</span>
          <strong>${escapeHtml(reasoningEffortLabel(state.system?.settings?.reasoning_effort || state.system?.default_reasoning_effort || "medium"))}</strong>
        </article>
        <article class="status-card">
          <span>终端软件</span>
          <strong>${escapeHtml(terminalAppLabel(state.system?.settings?.terminal_app || state.system?.default_terminal_app || "terminal"))}</strong>
        </article>
        <article class="status-card">
          <span>默认执行权限</span>
          <strong>${escapeHtml(sandboxModeLabel(state.system?.settings?.sandbox_mode || state.system?.default_sandbox_mode || "workspace-write"))}</strong>
        </article>
        <article class="status-card">
          <span>默认审批策略</span>
          <strong>${escapeHtml(approvalPolicyLabel(state.system?.settings?.approval_policy || state.system?.default_approval_policy || "never"))}</strong>
        </article>
        <article class="status-card">
          <span>Git 写提权</span>
          <strong>${escapeHtml(gitWriteEscalationLabel(state.settingsGitWriteEnabled))}</strong>
        </article>
        <article class="status-card">
          <span>Git 提权权限</span>
          <strong>${escapeHtml(state.settingsGitWriteEnabled ? `${sandboxModeLabel(state.settingsGitWriteSandboxMode)} / ${approvalPolicyLabel(state.settingsGitWriteApprovalPolicy)}` : "跟随默认")}</strong>
        </article>
      </section>

      <section class="composer-card settings-card shell-subpanel">
        <div class="card-head">
          <p class="eyebrow">Execution</p>
          <h3>默认模型、终端与执行权限</h3>
        </div>
        <form id="settings-form" class="composer-form">
          <label>
            <span>模型名称</span>
            <input name="settings_model" value="${escapeHtml(state.settingsModel)}" placeholder="例如 gpt-5.4" />
          </label>
          <div>
            <span class="field-title">思考强度</span>
            <div class="effort-toggle">
              ${(state.system?.reasoning_efforts || ["low", "medium", "high", "xhigh"])
                .map(
                  (level) =>
                    `<button class="effort-chip ${state.settingsEffort === level ? "active" : ""}" type="button" data-action="set-settings-effort" data-effort="${escapeHtml(level)}">${escapeHtml(reasoningEffortLabel(level))}</button>`,
                )
                .join("")}
            </div>
          </div>
          <label>
            <span>终端软件</span>
            <select name="terminal_app">
              ${(state.system?.terminal_apps || ["terminal", "iterm"])
                .map(
                  (value) =>
                    `<option value="${escapeHtml(value)}" ${state.settingsTerminalApp === value ? "selected" : ""}>${escapeHtml(terminalAppLabel(value))}</option>`,
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Sandbox 权限</span>
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
            <span>审批策略</span>
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
              <span>允许 Git 写操作提权</span>
              <p class="subtle">命中 git add、git commit、分支改写等请求时，自动切换到下面这组权限；“终端打开”也会使用它。</p>
            </div>
            <input name="git_write_enabled" type="checkbox" ${state.settingsGitWriteEnabled ? "checked" : ""} />
          </label>
          <div class="settings-subgrid">
            <label>
              <span>Git 写操作 Sandbox</span>
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
              <span>Git 写操作审批</span>
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
          <p class="subtle">这些设置只作用于 CodexApp 的 Web 执行与“终端打开”入口，不会再改你的主 Codex 配置文件。</p>
          <div class="composer-actions">
            <button class="primary-button" type="submit" ${state.settingsSaving ? "disabled" : ""}>${state.settingsSaving ? "保存中..." : "保存设置"}</button>
          </div>
        </form>
      </section>

      <section class="composer-card settings-card shell-subpanel">
        <div class="card-head">
          <p class="eyebrow">Security</p>
          <h3>修改登录密码</h3>
        </div>
        <form id="password-form" class="composer-form">
          <label>
            <span>当前密码</span>
            <input name="current_password" type="password" value="${escapeHtml(state.passwordCurrent)}" autocomplete="current-password" />
          </label>
          <label>
            <span>新密码</span>
            <input name="new_password" type="password" value="${escapeHtml(state.passwordNext)}" autocomplete="new-password" />
          </label>
          <label>
            <span>确认新密码</span>
            <input name="confirm_password" type="password" value="${escapeHtml(state.passwordConfirm)}" autocomplete="new-password" />
          </label>
          <div class="composer-actions">
            <button class="ghost-button" type="button" data-action="clear-password-form">清空</button>
            <button class="primary-button" type="submit" ${state.passwordSaving ? "disabled" : ""}>${state.passwordSaving ? "保存中..." : "修改密码"}</button>
          </div>
        </form>
      </section>
    </section>
  `;
}

function renderApp() {
  document.getElementById("app").innerHTML = `
    <main class="screen workspace-shell">
      <div class="workspace-layout">
        ${renderSidebar()}
        ${renderCurrentSessionPane()}
        ${renderSettingsPane()}
      </div>
      <div class="mobile-tabs">
        <button class="mobile-tab-button ${state.mobileTab === "projects" ? "active" : ""}" data-action="set-mobile-tab" data-tab="projects">项目列表</button>
        <button class="mobile-tab-button ${state.mobileTab === "session" ? "active" : ""}" data-action="set-mobile-tab" data-tab="session">当前会话</button>
        <button class="mobile-tab-button ${state.mobileTab === "settings" ? "active" : ""}" data-action="set-mobile-tab" data-tab="settings">设置</button>
      </div>
    </main>
  `;

  document.querySelectorAll(".thread-card-main[data-session-id]").forEach((element) => {
    element.addEventListener("click", async () => {
      const sessionId = element.getAttribute("data-session-id");
      if (sessionId) {
        state.mobileTab = "session";
        await selectSession(sessionId);
      }
    });
  });

  document.querySelectorAll("[data-action='focus-new-session']").forEach((element) => {
    element.addEventListener("click", () => {
      state.newSessionExpanded = true;
      state.mobileTab = "projects";
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
      state.mobileTab = "projects";
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
      state.mobileTab = "session";
      state.shouldScrollSessionBottom = true;
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
      const nextTitle = window.prompt("输入新的会话名称", session.title || "");
      if (nextTitle === null) {
        return;
      }
      const title = String(nextTitle || "").trim();
      if (!title) {
        window.alert("会话名称不能为空");
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
        window.alert(error.message || "改名失败");
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
      const confirmed = window.confirm(`确认删除会话「${session.title || sessionId}」吗？`);
      if (!confirmed) {
        return;
      }
      try {
        state.openSessionMenuId = null;
        await api(`/api/sessions/${sessionId}`, { method: "DELETE" });
        await refreshSessions();
        await syncSelectionAfterSessionsRefresh();
      } catch (error) {
        window.alert(error.message || "删除失败");
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
        window.alert(error.message || "调整顺序失败");
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
        window.alert(error.message || "终端打开失败");
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

  document.querySelectorAll("[data-action='set-mobile-tab']").forEach((element) => {
    element.addEventListener("click", () => {
      state.mobileTab = element.getAttribute("data-tab") || "session";
      if (state.mobileTab === "session") {
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
        window.alert(error.message || "取消失败");
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
      state.ws?.close();
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
        state.mobileTab = "session";
        state.shouldScrollSessionBottom = true;
        await refreshSessions();
        await selectSession(data.session.id);
      } catch (error) {
        window.alert(error.message || "提交失败");
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
        window.alert(error.message || "提交失败");
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
        window.alert(error.message || "保存设置失败");
      } finally {
        state.settingsSaving = false;
        render();
      }
    });

    settingsForm.querySelector("[name='settings_model']")?.addEventListener("input", (event) => {
      state.settingsModel = event.target.value;
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
        window.alert("密码已更新");
      } catch (error) {
        window.alert(error.message || "修改密码失败");
      } finally {
        state.passwordSaving = false;
        render();
      }
    });
  }
}

function render() {
  if (state.booting) {
    document.getElementById("app").innerHTML = `<main class="screen loading-screen"><div class="loading-card">Loading Codex console…</div></main>`;
    return;
  }
  if (!state.user) {
    renderLogin();
    return;
  }
  renderApp();
  if (state.shouldScrollSessionBottom && state.mobileTab === "session") {
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
  state.ws?.close();
  state.ws = null;
  state.wsConnected = false;
  state.messages = [];
  state.runs = [];
  state.liveEvents = [];
  if (state.selectedSessionId) {
    await selectSession(state.selectedSessionId);
  } else {
    render();
  }
}

async function refreshSessionState(sessionId) {
  const [messagesData, runsData] = await Promise.all([api(`/api/sessions/${sessionId}/messages`), api(`/api/sessions/${sessionId}/runs`)]);
  state.messages = messagesData.items;
  state.runs = runsData.items;
}

function bindWebSocket(sessionId) {
  state.ws?.close();
  if (!sessionId) {
    state.ws = null;
    state.wsConnected = false;
    return;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${window.location.host}/api/sessions/${sessionId}/events`);
  state.ws = ws;
  ws.addEventListener("open", () => {
    state.wsConnected = true;
    render();
  });
  ws.addEventListener("close", () => {
    state.wsConnected = false;
    render();
  });
  ws.addEventListener("message", async (event) => {
    const payload = JSON.parse(event.data);
    if (payload.event === "session.snapshot") {
      state.runs = payload.data.runs || [];
      state.liveEvents = payload.data.events || [];
      if (payload.data.session) {
        state.sessions = state.sessions.map((item) => (item.id === payload.data.session.id ? payload.data.session : item));
      }
      render();
      return;
    }
    if (payload.event === "run.event" || payload.event === "run.log") {
      state.liveEvents = [...state.liveEvents, payload.data.event].slice(-200);
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
      if (payload.event !== "run.queued" && state.selectedSessionId) {
        await refreshSessionState(state.selectedSessionId);
      }
      render();
    }
  });
}

async function selectSession(sessionId) {
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
  render();
}

async function bootstrap() {
  state.booting = true;
  render();
  try {
    const me = await api("/api/auth/me");
    state.user = me.user;
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

bootstrap();
