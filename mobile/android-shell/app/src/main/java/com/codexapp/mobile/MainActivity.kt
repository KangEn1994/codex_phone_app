package com.codexapp.mobile

import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.webkit.CookieManager
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import com.codexapp.mobile.databinding.ActivityMainBinding
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    companion object {
        private const val prefsName = "codexapp.mobile"
        private const val baseUrlPrefKey = "base_web_url"
        private const val pollIntervalMs = 7000L
    }

    private enum class Screen {
        INBOX,
        DETAIL,
        SETTINGS,
        LOGS,
    }

    private enum class OverlaySurface {
        LOGIN,
        ERROR,
        SERVER_CONFIG,
        SHELL,
    }

    private lateinit var binding: ActivityMainBinding
    private lateinit var preferences: SharedPreferences

    private val handler = Handler(Looper.getMainLooper())
    private val pollRunnable = Runnable {
        if (shouldPollShell()) {
            if (currentScreen == Screen.DETAIL && !selectedSessionId.isNullOrBlank()) {
                refreshSelectedSessionDetail(showLoadingIndicator = false)
            } else {
                refreshBootstrap(showLoadingIndicator = false)
            }
        }
        schedulePolling()
    }

    private var currentBaseUri: Uri? = null
    private var returnToLoginAfterServerConfig = false
    private var currentScreen = Screen.INBOX
    private var lastShellScreen = Screen.INBOX
    private var selectedSessionId: String? = null
    private var bootstrapData: JSONObject? = null
    private var selectedDetail: JSONObject? = null
    private var loginBusy = false
    private var logsReturnSurface = OverlaySurface.SHELL
    private var lastErrorMessage = ""
    private val logEntries = mutableListOf<String>()
    private val logTimeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        preferences = getSharedPreferences(prefsName, MODE_PRIVATE)

        CookieManager.getInstance().setAcceptCookie(true)

        onBackPressedDispatcher.addCallback(this) {
            when {
                binding.serverConfigPanel.visibility == View.VISIBLE -> {
                    if (currentBaseUri != null) {
                        dismissServerConfigPanel()
                    } else {
                        finish()
                    }
                }

                currentScreen == Screen.LOGS -> closeLogs()
                binding.loginPanel.visibility == View.VISIBLE -> finish()
                binding.detailScreen.visibility == View.VISIBLE -> showScreen(Screen.INBOX)
                else -> finish()
            }
        }

        bindActions()

        configuredBaseUri()?.let {
            currentBaseUri = it
            appendLog("发现已保存服务器地址：${currentServerLabel()}")
            tryBootstrapFromStoredSession()
        } ?: showServerConfigPanel()
    }

    override fun onStart() {
        super.onStart()
        schedulePolling()
    }

    override fun onStop() {
        super.onStop()
        stopPolling()
    }

    private fun bindActions() {
        binding.retryButton.setOnClickListener { retryVisibleState() }
        binding.changeServerButton.setOnClickListener { showServerConfigPanel() }

        binding.connectButton.setOnClickListener { saveServerAndContinue() }
        binding.cancelServerButton.setOnClickListener {
            if (currentBaseUri != null) {
                dismissServerConfigPanel()
            }
        }
        binding.serverUrlInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                saveServerAndContinue()
                true
            } else {
                false
            }
        }

        binding.loginButton.setOnClickListener { submitNativeLogin() }
        binding.loginChangeServerButton.setOnClickListener { showServerConfigPanel() }
        binding.loginLogsButton.setOnClickListener { openLogs(OverlaySurface.LOGIN) }
        binding.loginPasswordInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                submitNativeLogin()
                true
            } else {
                false
            }
        }

        binding.inboxTabButton.setOnClickListener { showScreen(Screen.INBOX) }
        binding.settingsTabButton.setOnClickListener { showScreen(Screen.SETTINGS) }
        binding.logsTabButton.setOnClickListener { showScreen(Screen.LOGS) }
        binding.inboxRefreshButton.setOnClickListener { refreshBootstrap() }
        binding.newSessionCreateButton.setOnClickListener { createSession() }

        binding.detailBackButton.setOnClickListener { showScreen(Screen.INBOX) }
        binding.detailSettingsButton.setOnClickListener { showScreen(Screen.SETTINGS) }
        binding.detailRefreshButton.setOnClickListener { refreshSelectedSessionDetail() }
        binding.detailPinButton.setOnClickListener { toggleSelectedSessionPin() }
        binding.detailSendButton.setOnClickListener { sendPromptToSelectedSession() }

        binding.settingsRefreshButton.setOnClickListener { refreshBootstrap() }
        binding.settingsChangeServerButton.setOnClickListener { showServerConfigPanel() }
        binding.settingsLogoutButton.setOnClickListener { logout() }
        binding.errorLogsButton.setOnClickListener { openLogs(OverlaySurface.ERROR) }
        binding.serverLogsButton.setOnClickListener { openLogs(OverlaySurface.SERVER_CONFIG) }
        binding.logsClearButton.setOnClickListener {
            logEntries.clear()
            appendLog("日志已清空")
        }
        binding.logsBackButton.setOnClickListener { closeLogs() }
    }

    private fun retryVisibleState() {
        when {
            binding.loginPanel.visibility == View.VISIBLE -> tryBootstrapFromStoredSession()
            binding.detailScreen.visibility == View.VISIBLE && !selectedSessionId.isNullOrBlank() -> refreshSelectedSessionDetail()
            else -> refreshBootstrap()
        }
    }

    private fun tryBootstrapFromStoredSession() {
        appendLog("开始检查已保存会话：${currentServerLabel()}")
        showLoginPanel()
        setLoginBusy(true, getString(R.string.login_loading))
        refreshBootstrap(showLoadingIndicator = false)
    }

    private fun refreshBootstrap(showLoadingIndicator: Boolean = true) {
        val baseUri = currentBaseUri
        if (baseUri == null) {
            showServerConfigPanel()
            return
        }
        appendLog("刷新 bootstrap：${baseUri}")
        if (showLoadingIndicator) {
            showLoading()
        }
        thread {
            val result = requestBootstrap(baseUri)
            runOnUiThread {
                when {
                    result.success -> {
                        setLoginBusy(false)
                        bootstrapData = result.data
                        if (selectedSessionId.isNullOrBlank() || sessions().none { it.optString("id") == selectedSessionId }) {
                            selectedSessionId = sessions().firstOrNull()?.optString("id")
                        }
                        renderInbox()
                        renderSettings()
                        renderLogs()
                        showShell()
                        if (currentScreen == Screen.DETAIL && !selectedSessionId.isNullOrBlank()) {
                            refreshSelectedSessionDetail(showLoadingIndicator = false)
                        } else {
                            showScreen(currentScreen)
                            hideLoading()
                        }
                    }

                    result.code == 401 -> {
                        appendLog("bootstrap 返回 401，需要重新登录")
                        hideLoading()
                        clearSessionCookies()
                        showLoginPanel(getString(R.string.error_message_sign_in_required))
                    }

                    else -> {
                        appendLog("bootstrap 失败：${result.userMessage.ifBlank { "未知错误" }}")
                        hideLoading()
                        if (binding.nativeShellPanel.visibility == View.VISIBLE) {
                            showError(result.userMessage.ifBlank { getString(R.string.error_message_default) })
                        } else {
                            setLoginBusy(false)
                            showLoginPanel(result.userMessage.ifBlank { getString(R.string.login_connection_failed) })
                        }
                    }
                }
            }
        }
    }

    private fun refreshSelectedSessionDetail(showLoadingIndicator: Boolean = true) {
        val baseUri = currentBaseUri
        val sessionId = selectedSessionId
        if (baseUri == null || sessionId.isNullOrBlank()) {
            showScreen(Screen.INBOX)
            return
        }
        appendLog("刷新会话详情：$sessionId")
        if (showLoadingIndicator) {
            showLoading()
        }
        thread {
            val result = requestSessionDetail(baseUri, sessionId)
            runOnUiThread {
                when {
                    result.success -> {
                        selectedDetail = result.data
                        renderDetail()
                        showScreen(Screen.DETAIL)
                        hideLoading()
                    }

                    result.code == 401 -> {
                        appendLog("会话详情返回 401：$sessionId")
                        hideLoading()
                        clearSessionCookies()
                        showLoginPanel(getString(R.string.error_message_sign_in_required))
                    }

                    else -> {
                        appendLog("会话详情失败：$sessionId ${result.userMessage.ifBlank { "未知错误" }}")
                        hideLoading()
                        showError(result.userMessage.ifBlank { getString(R.string.error_message_default) })
                    }
                }
            }
        }
    }

    private fun createSession() {
        val baseUri = currentBaseUri ?: return showServerConfigPanel()
        val workspaces = projectPaths()
        if (workspaces.isEmpty()) {
            showError(getString(R.string.native_workspace_required))
            return
        }
        val workspaceIndex = binding.newSessionWorkspaceSpinner.selectedItemPosition.coerceAtLeast(0)
        val cwd = workspaces.getOrNull(workspaceIndex).orEmpty()
        if (cwd.isBlank()) {
            showError(getString(R.string.native_workspace_required))
            return
        }
        val prompt = binding.newSessionPromptInput.text?.toString().orEmpty()
        appendLog("创建会话：cwd=$cwd")
        showLoading()
        thread {
            val payload = JSONObject()
                .put("cwd", cwd)
                .put("prompt", prompt)
                .toString()
            val result = performRequest(baseUri, "/api/sessions", "POST", payload)
            runOnUiThread {
                when {
                    result.success -> {
                        binding.newSessionPromptInput.setText("")
                        selectedSessionId = result.data?.optJSONObject("session")?.optString("id")
                        appendLog("创建会话成功：${selectedSessionId.orEmpty()}")
                        currentScreen = Screen.DETAIL
                        refreshBootstrap(showLoadingIndicator = false)
                    }

                    result.code == 401 -> {
                        appendLog("创建会话返回 401")
                        hideLoading()
                        clearSessionCookies()
                        showLoginPanel(getString(R.string.error_message_sign_in_required))
                    }

                    else -> {
                        appendLog("创建会话失败：${result.userMessage.ifBlank { "未知错误" }}")
                        hideLoading()
                        showError(result.userMessage.ifBlank { getString(R.string.error_message_default) })
                    }
                }
            }
        }
    }

    private fun sendPromptToSelectedSession() {
        val baseUri = currentBaseUri ?: return showServerConfigPanel()
        val sessionId = selectedSessionId ?: return
        val prompt = binding.detailPromptInput.text?.toString().orEmpty().trim()
        if (prompt.isBlank()) {
            return
        }
        appendLog("继续会话：$sessionId")
        showLoading()
        thread {
            val payload = JSONObject().put("prompt", prompt).toString()
            val result = performRequest(baseUri, "/api/sessions/$sessionId/runs", "POST", payload)
            runOnUiThread {
                when {
                    result.success -> {
                        binding.detailPromptInput.setText("")
                        appendLog("继续会话成功：$sessionId")
                        refreshSelectedSessionDetail(showLoadingIndicator = false)
                    }

                    result.code == 401 -> {
                        appendLog("继续会话返回 401：$sessionId")
                        hideLoading()
                        clearSessionCookies()
                        showLoginPanel(getString(R.string.error_message_sign_in_required))
                    }

                    else -> {
                        appendLog("继续会话失败：$sessionId ${result.userMessage.ifBlank { "未知错误" }}")
                        hideLoading()
                        showError(result.userMessage.ifBlank { getString(R.string.error_message_default) })
                    }
                }
            }
        }
    }

    private fun toggleSelectedSessionPin() {
        val session = selectedSession() ?: return
        toggleSessionPin(session.optString("id"), !session.optBoolean("pinned"))
    }

    private fun toggleSessionPin(sessionId: String, nextPinned: Boolean) {
        val baseUri = currentBaseUri ?: return showServerConfigPanel()
        appendLog("更新置顶状态：$sessionId -> $nextPinned")
        showLoading()
        thread {
            val payload = JSONObject().put("pinned", nextPinned).toString()
            val result = performRequest(baseUri, "/api/sessions/$sessionId", "PATCH", payload)
            runOnUiThread {
                when {
                    result.success -> {
                        appendLog("更新置顶成功：$sessionId")
                        refreshBootstrap(showLoadingIndicator = false)
                    }

                    result.code == 401 -> {
                        appendLog("更新置顶返回 401：$sessionId")
                        hideLoading()
                        clearSessionCookies()
                        showLoginPanel(getString(R.string.error_message_sign_in_required))
                    }

                    else -> {
                        appendLog("更新置顶失败：$sessionId ${result.userMessage.ifBlank { "未知错误" }}")
                        hideLoading()
                        showError(result.userMessage.ifBlank { getString(R.string.error_message_default) })
                    }
                }
            }
        }
    }

    private fun submitNativeLogin() {
        val baseUri = currentBaseUri ?: return showServerConfigPanel()
        val username = binding.loginUsernameInput.text?.toString()?.trim().orEmpty()
        val password = binding.loginPasswordInput.text?.toString().orEmpty()
        if (username.isBlank()) {
            binding.loginUsernameInput.error = getString(R.string.login_username_required)
            return
        }
        if (password.isBlank()) {
            binding.loginPasswordInput.error = getString(R.string.login_password_required)
            return
        }
        binding.loginUsernameInput.error = null
        binding.loginPasswordInput.error = null
        appendLog("尝试登录：server=${baseUri} username=$username")
        setLoginBusy(true, getString(R.string.login_loading))
        thread {
            val payload = JSONObject()
                .put("username", username)
                .put("password", password)
                .toString()
            val result = performRequest(baseUri, "/api/auth/login", "POST", payload)
            runOnUiThread {
                when {
                    result.success -> {
                        applyResponseCookies(baseUri.toString(), result.setCookies)
                        binding.loginPasswordInput.setText("")
                        appendLog("登录成功：$username")
                        refreshBootstrap(showLoadingIndicator = false)
                    }

                    result.code == 401 -> {
                        appendLog("登录失败：401 Unauthorized")
                        setLoginBusy(false, getString(R.string.login_invalid_credentials))
                    }

                    else -> {
                        appendLog("登录失败：${result.userMessage.ifBlank { "未知错误" }}")
                        setLoginBusy(false, result.userMessage.ifBlank { getString(R.string.login_connection_failed) })
                    }
                }
            }
        }
    }

    private fun logout() {
        val baseUri = currentBaseUri ?: return showLoginPanel()
        appendLog("退出登录：${baseUri}")
        showLoading()
        thread {
            performRequest(baseUri, "/api/auth/logout", "POST", "{}")
            runOnUiThread {
                clearSessionCookies()
                bootstrapData = null
                selectedDetail = null
                selectedSessionId = null
                currentScreen = Screen.INBOX
                hideLoading()
                appendLog("退出登录完成")
                showLoginPanel()
            }
        }
    }

    private fun showShell() {
        if (currentScreen == Screen.LOGS && logsReturnSurface != OverlaySurface.SHELL) {
            currentScreen = lastShellScreen
            logsReturnSurface = OverlaySurface.SHELL
        }
        binding.nativeShellPanel.visibility = View.VISIBLE
        binding.errorPanel.visibility = View.GONE
        binding.serverConfigPanel.visibility = View.GONE
        binding.loginPanel.visibility = View.GONE
    }

    private fun showScreen(screen: Screen) {
        if (screen != Screen.LOGS) {
            lastShellScreen = screen
            logsReturnSurface = OverlaySurface.SHELL
        }
        currentScreen = screen
        binding.inboxScreen.visibility = if (screen == Screen.INBOX) View.VISIBLE else View.GONE
        binding.detailScreen.visibility = if (screen == Screen.DETAIL) View.VISIBLE else View.GONE
        binding.settingsScreen.visibility = if (screen == Screen.SETTINGS) View.VISIBLE else View.GONE
        binding.logsScreen.visibility = if (screen == Screen.LOGS) View.VISIBLE else View.GONE
        binding.shellTopbar.visibility = if (screen == Screen.LOGS && logsReturnSurface != OverlaySurface.SHELL) View.GONE else View.VISIBLE
        binding.inboxTabButton.isEnabled = screen != Screen.INBOX
        binding.settingsTabButton.isEnabled = screen != Screen.SETTINGS
        binding.logsTabButton.isEnabled = screen != Screen.LOGS
        binding.shellSubtitle.text = when (screen) {
            Screen.INBOX -> getString(R.string.native_shell_subtitle_default)
            Screen.DETAIL -> selectedSession()?.optString("title").orEmpty()
            Screen.SETTINGS -> getString(R.string.native_settings_title)
            Screen.LOGS -> getString(R.string.native_logs_title)
        }
        if (screen == Screen.LOGS) {
            renderLogs()
        }
    }

    private fun renderInbox() {
        val workspaceOptions = projectLabels()
        binding.newSessionWorkspaceSpinner.adapter =
            ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, workspaceOptions.ifEmpty { listOf(getString(R.string.native_workspace_required)) })

        binding.sessionsListContainer.removeAllViews()
        val items = sessions()
        if (items.isEmpty()) {
            binding.sessionsListContainer.addView(emptyStateView(getString(R.string.native_empty_sessions)))
            return
        }

        items.forEach { session ->
            binding.sessionsListContainer.addView(sessionCard(session))
        }
    }

    private fun renderSettings() {
        binding.settingsServerValue.text = currentServerLabel()
        val system = bootstrapData?.optJSONObject("system")
        val model = system?.optString("default_model").orEmpty().ifBlank { "default" }
        val cli = system?.optString("codex_cli_version").orEmpty().ifBlank { "unknown" }
        val activeRuns = system?.optInt("active_runs") ?: 0
        binding.settingsSystemValue.text = "CLI $cli\nModel $model\nActive runs $activeRuns"
    }

    private fun renderLogs() {
        binding.logsListContainer.removeAllViews()
        if (logEntries.isEmpty()) {
            binding.logsListContainer.addView(emptyStateView(getString(R.string.native_logs_empty)))
            return
        }
        logEntries.forEach { line ->
            binding.logsListContainer.addView(
                textView(line, 13f, Typeface.NORMAL, "#162033").apply {
                    background = roundedCard("#FFFFFF")
                    setPadding(dp(14), dp(14), dp(14), dp(14))
                    layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                        bottomMargin = dp(10)
                    }
                },
            )
        }
    }

    private fun renderDetail() {
        val detail = selectedDetail
        val session = detail?.optJSONObject("session")
        if (session == null) {
            binding.detailMessagesContainer.removeAllViews()
            binding.detailMessagesContainer.addView(emptyStateView(getString(R.string.native_select_session)))
            return
        }
        binding.detailTitle.text = session.optString("title").ifBlank { session.optString("id") }
        binding.detailMeta.text = buildString {
            append(session.optString("cwd"))
            val model = session.optString("model")
            if (model.isNotBlank()) {
                append("\n")
                append(model)
            }
        }
        binding.detailStatusText.text = sessionStatusLabel(session)
        binding.detailPinButton.text = getString(if (session.optBoolean("pinned")) R.string.native_unpin else R.string.native_pin)

        binding.detailMessagesContainer.removeAllViews()
        val messages = detail.optJSONArray("messages").toJsonObjects()
        if (messages.isEmpty()) {
            binding.detailMessagesContainer.addView(emptyStateView(getString(R.string.native_empty_messages)))
        } else {
            messages.forEach { message ->
                binding.detailMessagesContainer.addView(messageCard(message))
            }
        }
        binding.detailMessagesScroll.post {
            binding.detailMessagesScroll.fullScroll(View.FOCUS_DOWN)
        }
    }

    private fun sessionCard(session: JSONObject): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = roundedCard("#FFFFFF")
            setPadding(dp(16), dp(16), dp(16), dp(16))
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                bottomMargin = dp(12)
            }
            setOnClickListener {
                selectedSessionId = session.optString("id")
                currentScreen = Screen.DETAIL
                refreshSelectedSessionDetail()
            }
        }

        card.addView(textView(session.optString("title").ifBlank { session.optString("id") }, 18f, Typeface.BOLD, "#162033"))
        card.addView(textView(sessionStatusLabel(session), 14f, Typeface.NORMAL, "#44618E").apply {
            setPadding(0, dp(6), 0, 0)
        })
        card.addView(textView(sessionSummary(session), 15f, Typeface.NORMAL, "#31415D").apply {
            setPadding(0, dp(8), 0, 0)
        })
        card.addView(textView(session.optString("cwd"), 13f, Typeface.NORMAL, "#60708E").apply {
            setPadding(0, dp(8), 0, 0)
        })

        val actions = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(12), 0, 0)
        }
        actions.addView(actionButton(getString(if (session.optBoolean("pinned")) R.string.native_unpin else R.string.native_pin)) {
            toggleSessionPin(session.optString("id"), !session.optBoolean("pinned"))
        }.apply {
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        })
        actions.addView(actionButton(getString(R.string.native_send_prompt)) {
            selectedSessionId = session.optString("id")
            currentScreen = Screen.DETAIL
            refreshSelectedSessionDetail()
        }.apply {
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = dp(10)
            }
        })
        card.addView(actions)

        return card
    }

    private fun messageCard(message: JSONObject): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = roundedCard(if (message.optString("role") == "assistant") "#EEF5FF" else "#FFFFFF")
            setPadding(dp(14), dp(14), dp(14), dp(14))
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                bottomMargin = dp(10)
            }
        }
        val header = buildString {
            append(if (message.optString("role") == "assistant") "Codex" else "You")
            val createdAt = message.optString("created_at")
            if (createdAt.isNotBlank()) {
                append(" · ")
                append(createdAt)
            }
        }
        card.addView(textView(header, 13f, Typeface.BOLD, "#60708E"))
        card.addView(textView(message.optString("text"), 15f, Typeface.NORMAL, "#162033").apply {
            setPadding(0, dp(8), 0, 0)
        })
        return card
    }

    private fun emptyStateView(text: String): View {
        return textView(text, 15f, Typeface.NORMAL, "#60708E").apply {
            setPadding(dp(12), dp(12), dp(12), dp(12))
        }
    }

    private fun actionButton(label: String, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = label
            setOnClickListener { onClick() }
        }
    }

    private fun textView(text: String, sizeSp: Float, typeface: Int, colorHex: String): TextView {
        return TextView(this).apply {
            this.text = text
            setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
            setTypeface(null, typeface)
            setTextColor(Color.parseColor(colorHex))
        }
    }

    private fun roundedCard(colorHex: String): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(22).toFloat()
            setColor(Color.parseColor(colorHex))
        }
    }

    private fun sessions(): List<JSONObject> {
        return bootstrapData?.optJSONArray("sessions").toJsonObjects()
    }

    private fun selectedSession(): JSONObject? {
        val sessionId = selectedSessionId ?: return null
        return sessions().firstOrNull { it.optString("id") == sessionId }
            ?: selectedDetail?.optJSONObject("session")
    }

    private fun projectPaths(): List<String> {
        return bootstrapData?.optJSONArray("projects").toJsonObjects().map { it.optString("path") }.filter { it.isNotBlank() }
    }

    private fun projectLabels(): List<String> {
        return bootstrapData?.optJSONArray("projects").toJsonObjects().map { workspace ->
            "${workspace.optString("name")} • ${workspace.optString("path")}"
        }.filter { it.isNotBlank() }
    }

    private fun sessionSummary(session: JSONObject): String {
        val latestRun = session.optJSONObject("latest_run")
        val finalMessage = latestRun?.optString("final_message").orEmpty()
        if (finalMessage.isNotBlank()) {
            return finalMessage
        }
        val prompt = latestRun?.optString("prompt").orEmpty()
        if (prompt.isNotBlank()) {
            return prompt
        }
        return session.optString("cwd")
    }

    private fun sessionStatusLabel(session: JSONObject): String {
        val latestRun = session.optJSONObject("latest_run")
        return when (latestRun?.optString("status").orEmpty().ifBlank { session.optString("status") }) {
            "running" -> "执行中"
            "queued" -> "排队中"
            "failed" -> "失败"
            "completed" -> "已完成"
            "cancelled" -> "已取消"
            else -> "空闲"
        }
    }

    private fun saveServerAndContinue() {
        val parsed = ShellConfig.normalizeBaseWebUrl(binding.serverUrlInput.text?.toString().orEmpty())
        if (parsed == null) {
            binding.serverUrlInput.error = getString(R.string.invalid_server_url)
            return
        }
        binding.serverUrlInput.error = null
        preferences.edit().putString(baseUrlPrefKey, parsed.toString()).apply()
        currentBaseUri = parsed
        appendLog("保存服务器地址：${parsed}")
        dismissServerConfigPanel()
        tryBootstrapFromStoredSession()
    }

    private fun configuredBaseUri(): Uri? {
        val stored = preferences.getString(baseUrlPrefKey, null) ?: return null
        return ShellConfig.normalizeBaseWebUrl(stored)
    }

    private fun showServerConfigPanel() {
        returnToLoginAfterServerConfig = binding.loginPanel.visibility == View.VISIBLE || binding.nativeShellPanel.visibility != View.VISIBLE
        val currentValue = currentBaseUri?.toString()
            ?: preferences.getString(baseUrlPrefKey, ShellConfig.defaultBaseWebUrl)
            ?: ShellConfig.defaultBaseWebUrl
        binding.serverUrlInput.setText(currentValue)
        binding.serverUrlInput.setSelection(binding.serverUrlInput.text?.length ?: 0)
        binding.serverConfigPanel.visibility = View.VISIBLE
        binding.cancelServerButton.visibility = if (currentBaseUri == null) View.GONE else View.VISIBLE
        binding.loginPanel.visibility = View.GONE
        binding.errorPanel.visibility = View.GONE
        binding.nativeShellPanel.visibility = View.GONE
        appendLog("打开服务器配置页")
        hideLoading()
    }

    private fun dismissServerConfigPanel() {
        binding.serverConfigPanel.visibility = View.GONE
        if (returnToLoginAfterServerConfig) {
            showLoginPanel()
        } else if (bootstrapData != null) {
            showShell()
            showScreen(currentScreen)
        }
    }

    private fun showLoginPanel(message: String? = null) {
        binding.loginServerValue.text = currentServerLabel()
        binding.loginPanel.visibility = View.VISIBLE
        binding.serverConfigPanel.visibility = View.GONE
        binding.errorPanel.visibility = View.GONE
        binding.nativeShellPanel.visibility = View.GONE
        setLoginBusy(false, message)
    }

    private fun setLoginBusy(isBusy: Boolean, statusMessage: String? = null) {
        loginBusy = isBusy
        binding.loginButton.isEnabled = !isBusy
        binding.loginChangeServerButton.isEnabled = !isBusy
        binding.loginLogsButton.isEnabled = !isBusy
        binding.loginUsernameInput.isEnabled = !isBusy
        binding.loginPasswordInput.isEnabled = !isBusy
        binding.loginButton.text = getString(if (isBusy) R.string.login_loading else R.string.login_submit)
        val status = statusMessage?.trim().orEmpty()
        binding.loginStatusText.text = status
        binding.loginStatusText.visibility = if (status.isEmpty()) View.GONE else View.VISIBLE
        if (isBusy) showLoading() else hideLoading()
    }

    private fun showError(message: String) {
        appendLog("显示错误页：$message")
        lastErrorMessage = message
        binding.errorTitle.text = getString(R.string.error_title)
        binding.errorMessage.text = message
        binding.errorPanel.visibility = View.VISIBLE
        binding.loginPanel.visibility = View.GONE
        binding.serverConfigPanel.visibility = View.GONE
        binding.nativeShellPanel.visibility = View.GONE
    }

    private fun openLogs(source: OverlaySurface) {
        logsReturnSurface = source
        binding.loginPanel.visibility = View.GONE
        binding.serverConfigPanel.visibility = View.GONE
        binding.errorPanel.visibility = View.GONE
        binding.nativeShellPanel.visibility = View.VISIBLE
        showScreen(Screen.LOGS)
    }

    private fun closeLogs() {
        when (logsReturnSurface) {
            OverlaySurface.LOGIN -> {
                currentScreen = lastShellScreen
                logsReturnSurface = OverlaySurface.SHELL
                showLoginPanel(binding.loginStatusText.text?.toString())
            }

            OverlaySurface.ERROR -> {
                currentScreen = lastShellScreen
                logsReturnSurface = OverlaySurface.SHELL
                restoreErrorPanel()
            }

            OverlaySurface.SERVER_CONFIG -> {
                currentScreen = lastShellScreen
                logsReturnSurface = OverlaySurface.SHELL
                restoreServerConfigPanel()
            }

            OverlaySurface.SHELL -> {
                if (bootstrapData != null) {
                    showShell()
                    showScreen(lastShellScreen)
                } else {
                    showLoginPanel()
                }
            }
        }
    }

    private fun restoreServerConfigPanel() {
        binding.serverConfigPanel.visibility = View.VISIBLE
        binding.cancelServerButton.visibility = if (currentBaseUri == null) View.GONE else View.VISIBLE
        binding.loginPanel.visibility = View.GONE
        binding.errorPanel.visibility = View.GONE
        binding.nativeShellPanel.visibility = View.GONE
        hideLoading()
    }

    private fun restoreErrorPanel() {
        binding.errorTitle.text = getString(R.string.error_title)
        binding.errorMessage.text = lastErrorMessage.ifBlank { getString(R.string.error_message_default) }
        binding.errorPanel.visibility = View.VISIBLE
        binding.loginPanel.visibility = View.GONE
        binding.serverConfigPanel.visibility = View.GONE
        binding.nativeShellPanel.visibility = View.GONE
        hideLoading()
    }

    private fun showLoading() {
        binding.loadingIndicator.visibility = View.VISIBLE
    }

    private fun hideLoading() {
        binding.loadingIndicator.visibility = View.GONE
    }

    private fun currentServerLabel(): String {
        return currentBaseUri?.toString()?.removeSuffix("/") ?: getString(R.string.server_unknown)
    }

    private fun schedulePolling() {
        handler.removeCallbacks(pollRunnable)
        handler.postDelayed(pollRunnable, pollIntervalMs)
    }

    private fun stopPolling() {
        handler.removeCallbacks(pollRunnable)
    }

    private fun clearSessionCookies() {
        val cookieManager = CookieManager.getInstance()
        cookieManager.removeAllCookies(null)
        cookieManager.flush()
    }

    private fun applyResponseCookies(url: String, cookies: List<String>) {
        val cookieManager = CookieManager.getInstance()
        cookies.forEach { cookie ->
            cookieManager.setCookie(url, cookie)
        }
        cookieManager.flush()
    }

    private fun performRequest(baseUri: Uri, path: String, method: String, body: String?): ApiResult {
        val endpoint = baseUri.buildUpon().encodedPath(path).build().toString()
        appendLog("HTTP $method $endpoint")
        return runCatching {
            val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 8000
                readTimeout = 8000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-Requested-With", "CodexAppMobile")
                CookieManager.getInstance().getCookie(baseUri.toString())?.takeIf { it.isNotBlank() }?.let {
                    setRequestProperty("Cookie", it)
                }
                if (body != null) {
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    OutputStreamWriter(outputStream, Charsets.UTF_8).use { writer ->
                        writer.write(body)
                    }
                }
            }

            val code = connection.responseCode
            val responseMessage = connection.responseMessage.orEmpty()
            val responseText = runCatching {
                val stream = if (code in 200..299) connection.inputStream else connection.errorStream ?: connection.inputStream
                stream.bufferedReader().use { it.readText() }
            }.getOrDefault("")
            val root = runCatching { JSONObject(responseText) }.getOrNull()
            val data = root?.optJSONObject("data")
            val message = extractResponseMessage(code, responseMessage, responseText, root)
            val cookies = connection.headerFields["Set-Cookie"].orEmpty()
            connection.disconnect()
            appendLog("HTTP $method $endpoint -> $code $message")
            ApiResult(success = code in 200..299, code = code, data = data, userMessage = if (code in 200..299) "" else message, setCookies = cookies)
        }.getOrElse {
            val networkMessage = formatNetworkErrorMessage(it.message.orEmpty())
            appendLog("HTTP $method $endpoint -> NETWORK_ERROR $networkMessage")
            ApiResult(
                success = false,
                code = -1,
                data = null,
                userMessage = buildNetworkFailureMessage(baseUri),
                setCookies = emptyList(),
            )
        }
    }

    private fun requestBootstrap(baseUri: Uri): ApiResult {
        val mobileResult = performRequest(baseUri, "/api/mobile/bootstrap", "GET", null)
        if (mobileResult.success || mobileResult.code != 404) {
            return mobileResult
        }
        appendLog("未发现 /api/mobile/bootstrap，回退到旧版接口组合")
        val systemResult = performRequest(baseUri, "/api/system/status", "GET", null)
        if (!systemResult.success) {
            return systemResult
        }
        val projectsResult = performRequest(baseUri, "/api/projects", "GET", null)
        if (!projectsResult.success) {
            return projectsResult
        }
        val sessionsResult = performRequest(baseUri, "/api/sessions", "GET", null)
        if (!sessionsResult.success) {
            return sessionsResult
        }
        appendLog("旧版 bootstrap 回退成功")
        return ApiResult(
            success = true,
            code = 200,
            data = JSONObject()
                .put("user", JSONObject())
                .put("projects", projectsResult.data.jsonArrayOrEmpty("items"))
                .put("sessions", sessionsResult.data.jsonArrayOrEmpty("items"))
                .put("system", systemResult.data ?: JSONObject()),
            userMessage = "",
            setCookies = emptyList(),
        )
    }

    private fun requestSessionDetail(baseUri: Uri, sessionId: String): ApiResult {
        val mobileResult = performRequest(baseUri, "/api/mobile/sessions/$sessionId/detail", "GET", null)
        if (mobileResult.success || mobileResult.code != 404) {
            return mobileResult
        }
        appendLog("未发现 /api/mobile/sessions/$sessionId/detail，回退到旧版会话接口")
        val sessionResult = performRequest(baseUri, "/api/sessions/$sessionId", "GET", null)
        if (!sessionResult.success) {
            return sessionResult
        }
        val messagesResult = performRequest(baseUri, "/api/sessions/$sessionId/messages", "GET", null)
        if (!messagesResult.success) {
            return messagesResult
        }
        val runsResult = performRequest(baseUri, "/api/sessions/$sessionId/runs", "GET", null)
        if (!runsResult.success) {
            return runsResult
        }
        appendLog("旧版会话详情回退成功：$sessionId")
        return ApiResult(
            success = true,
            code = 200,
            data = JSONObject()
                .put("session", sessionResult.data?.optJSONObject("session") ?: JSONObject())
                .put("messages", messagesResult.data.jsonArrayOrEmpty("items"))
                .put("runs", runsResult.data.jsonArrayOrEmpty("items")),
            userMessage = "",
            setCookies = emptyList(),
        )
    }

    private fun extractResponseMessage(code: Int, responseMessage: String, responseText: String, root: JSONObject?): String {
        val errorMessage = root?.optJSONObject("error")?.optString("message").orEmpty()
        if (errorMessage.isNotBlank()) {
            return errorMessage
        }
        val topLevelMessage = root?.optString("message").orEmpty()
        if (topLevelMessage.isNotBlank()) {
            return topLevelMessage
        }
        when (val detail = root?.opt("detail")) {
            is String -> if (detail.isNotBlank()) return detail
            is JSONObject -> {
                val detailMessage = detail.optString("message").ifBlank { detail.optString("detail") }
                if (detailMessage.isNotBlank()) {
                    return detailMessage
                }
            }

            is JSONArray -> {
                val firstItem = detail.optJSONObject(0)
                val detailMessage = firstItem?.optString("msg").orEmpty()
                if (detailMessage.isNotBlank()) {
                    return detailMessage
                }
            }
        }
        if (code !in 200..299 && responseText.isNotBlank() && !responseText.trimStart().startsWith("<")) {
            return responseText.lineSequence().first().trim().take(120).ifBlank { responseMessage.ifBlank { "HTTP $code" } }
        }
        return if (code in 200..299) {
            responseMessage.ifBlank { "OK" }
        } else {
            responseMessage.ifBlank { "HTTP $code" }
        }
    }

    private fun appendLog(message: String) {
        val line = "${LocalTime.now().format(logTimeFormatter)}  $message"
        handler.post {
            logEntries.add(0, line)
            if (logEntries.size > 200) {
                logEntries.removeLast()
            }
            if (currentScreen == Screen.LOGS && binding.nativeShellPanel.visibility == View.VISIBLE) {
                renderLogs()
            }
        }
    }

    private fun JSONArray?.toJsonObjects(): List<JSONObject> {
        if (this == null) {
            return emptyList()
        }
        return buildList {
            for (index in 0 until length()) {
                optJSONObject(index)?.let(::add)
            }
        }
    }

    private fun shouldPollShell(): Boolean {
        return binding.nativeShellPanel.visibility == View.VISIBLE &&
            bootstrapData != null &&
            logsReturnSurface == OverlaySurface.SHELL &&
            currentScreen != Screen.LOGS
    }

    private fun buildNetworkFailureMessage(baseUri: Uri): String {
        return "无法连接到当前服务器（${baseUri.hostWithPort()}），请检查地址、端口或服务状态。"
    }

    private fun formatNetworkErrorMessage(raw: String): String {
        if (raw.isBlank()) {
            return "连接失败"
        }
        return raw.replace(Regex("""([A-Za-z0-9.-]+)/((?:\d{1,3}\.){3}\d{1,3}:\d+)"""), "$1 ($2)")
    }

    private fun Uri.hostWithPort(): String {
        return if (port != -1) {
            "${host.orEmpty()}:$port"
        } else {
            host.orEmpty()
        }
    }

    private fun JSONObject?.jsonArrayOrEmpty(name: String): JSONArray {
        return this?.optJSONArray(name) ?: JSONArray()
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()
    }

    private data class ApiResult(
        val success: Boolean,
        val code: Int,
        val data: JSONObject?,
        val userMessage: String,
        val setCookies: List<String>,
    )
}
