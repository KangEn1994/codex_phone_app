package com.codexapp.mobile

import android.annotation.SuppressLint
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewFeature
import androidx.webkit.WebViewCompat
import com.codexapp.mobile.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    companion object {
        private const val prefsName = "codexapp.mobile"
        private const val baseUrlPrefKey = "base_web_url"
    }

    private lateinit var binding: ActivityMainBinding
    private lateinit var preferences: SharedPreferences
    private var currentBaseUri: Uri? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        preferences = getSharedPreferences(prefsName, MODE_PRIVATE)

        onBackPressedDispatcher.addCallback(this) {
            if (binding.serverConfigPanel.visibility == View.VISIBLE) {
                if (currentBaseUri != null) {
                    hideServerConfigPanel()
                } else {
                    finish()
                }
            } else if (binding.webView.canGoBack()) {
                binding.webView.goBack()
            } else {
                finish()
            }
        }

        binding.retryButton.setOnClickListener {
            showLoading()
            binding.webView.reload()
        }
        binding.changeServerButton.setOnClickListener { showServerConfigPanel() }
        binding.cancelServerButton.setOnClickListener {
            if (currentBaseUri != null) {
                hideServerConfigPanel()
            }
        }
        binding.connectButton.setOnClickListener { saveServerAndLoad() }
        binding.serverUrlInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                saveServerAndLoad()
                true
            } else {
                false
            }
        }

        configureWebView(binding.webView)
        val initialUri = configuredBaseUri()
        if (initialUri == null) {
            showServerConfigPanel()
        } else {
            currentBaseUri = initialUri
            loadHome()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView(webView: WebView) {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        if (ShellConfig.enableWebDebug && WebViewFeature.isFeatureSupported(WebViewFeature.START_SAFE_BROWSING)) {
            WebViewCompat.startSafeBrowsing(this) {}
        }
        WebView.setWebContentsDebuggingEnabled(ShellConfig.enableWebDebug)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            builtInZoomControls = false
            displayZoomControls = false
            userAgentString = "${userAgentString} ${ShellConfig.userAgentSuffix}"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return true
                return when (NavigationPolicy.evaluate(uri, currentBaseUri)) {
                    NavigationDecision.InApp -> false
                    NavigationDecision.External -> {
                        openExternal(uri)
                        true
                    }
                    NavigationDecision.Blocked -> {
                        showError("当前链接不允许在应用内打开。")
                        true
                    }
                }
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                showLoading()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                hideError()
                hideLoading()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?,
            ) {
                if (request?.isForMainFrame == true) {
                    showError(error?.description?.toString() ?: getString(R.string.error_message_default))
                }
            }
        }
    }

    private fun loadHome() {
        val targetUri = currentBaseUri ?: configuredBaseUri()
        if (targetUri == null) {
            showServerConfigPanel()
            return
        }
        currentBaseUri = targetUri
        hideServerConfigPanel()
        hideError()
        binding.webView.loadUrl(targetUri.toString())
    }

    private fun saveServerAndLoad() {
        val parsed = ShellConfig.normalizeBaseWebUrl(binding.serverUrlInput.text?.toString().orEmpty())
        if (parsed == null) {
            binding.serverUrlInput.error = getString(R.string.invalid_server_url)
            return
        }

        binding.serverUrlInput.error = null
        preferences.edit().putString(baseUrlPrefKey, parsed.toString()).apply()
        currentBaseUri = parsed
        showLoading()
        loadHome()
    }

    private fun configuredBaseUri(): Uri? {
        val stored = preferences.getString(baseUrlPrefKey, null) ?: return null
        return ShellConfig.normalizeBaseWebUrl(stored)
    }

    private fun showServerConfigPanel() {
        val currentValue = currentBaseUri?.toString()
            ?: preferences.getString(baseUrlPrefKey, ShellConfig.defaultBaseWebUrl)
            ?: ShellConfig.defaultBaseWebUrl
        binding.serverUrlInput.setText(currentValue)
        binding.serverUrlInput.setSelection(binding.serverUrlInput.text?.length ?: 0)
        binding.serverUrlInput.error = null
        binding.serverConfigPanel.visibility = View.VISIBLE
        binding.cancelServerButton.visibility = if (currentBaseUri == null) View.GONE else View.VISIBLE
        binding.errorPanel.visibility = View.GONE
        hideLoading()
    }

    private fun hideServerConfigPanel() {
        binding.serverConfigPanel.visibility = View.GONE
    }

    private fun openExternal(uri: Uri) {
        startActivity(Intent(Intent.ACTION_VIEW, uri))
    }

    private fun showLoading() {
        binding.loadingIndicator.visibility = View.VISIBLE
    }

    private fun hideLoading() {
        binding.loadingIndicator.visibility = View.GONE
    }

    private fun hideError() {
        binding.errorPanel.visibility = View.GONE
    }

    private fun showError(message: String) {
        binding.errorTitle.text = getString(R.string.error_title)
        binding.errorMessage.text = message
        binding.errorPanel.visibility = View.VISIBLE
        hideLoading()
    }
}
