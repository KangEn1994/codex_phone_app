package com.codexapp.mobile

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
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
    private lateinit var binding: ActivityMainBinding

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        onBackPressedDispatcher.addCallback(this) {
            if (binding.webView.canGoBack()) {
                binding.webView.goBack()
            } else {
                finish()
            }
        }

        binding.retryButton.setOnClickListener {
            showLoading()
            binding.webView.reload()
        }

        configureWebView(binding.webView)
        loadHome()
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
                return when (NavigationPolicy.evaluate(uri)) {
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
        binding.webView.loadUrl(ShellConfig.baseWebUrl)
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
