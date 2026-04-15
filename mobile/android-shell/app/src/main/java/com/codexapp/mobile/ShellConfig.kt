package com.codexapp.mobile

import android.net.Uri

object ShellConfig {
    const val defaultBaseWebUrl = "http://example.com:8000/"
    const val userAgentSuffix = "CodexAppMobile Android/1.0.0"
    const val enableWebDebug = false

    private val staticAllowedHosts = setOf(
        "codexapp.example.com",
    )

    val externalHosts = setOf(
        "github.com",
        "openai.com",
    )

    val allowedSchemes = setOf("https", "http")
    val externalSchemes = setOf("mailto", "tel", "sms")

    fun normalizeBaseWebUrl(raw: String): Uri? {
        val candidate = raw.trim()
        if (candidate.isEmpty()) {
            return null
        }

        val withScheme = if ("://" in candidate) candidate else "https://$candidate"
        val parsed = runCatching { Uri.parse(withScheme) }.getOrNull() ?: return null
        val scheme = parsed.scheme?.lowercase() ?: return null
        val host = parsed.host?.lowercase() ?: return null
        if (scheme !in allowedSchemes || host.isBlank()) {
            return null
        }

        val builder = parsed.buildUpon()
        if ((parsed.encodedPath ?: "").isBlank()) {
            builder.encodedPath("/")
        }
        return builder.build()
    }

    fun allowedHosts(baseUri: Uri?): Set<String> {
        val dynamicHost = baseUri?.host?.lowercase()
        return if (dynamicHost.isNullOrBlank()) {
            staticAllowedHosts
        } else {
            staticAllowedHosts + dynamicHost
        }
    }
}
