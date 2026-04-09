package com.codexapp.mobile

object ShellConfig {
    const val baseWebUrl = "https://codexapp.example.com/"
    const val userAgentSuffix = "CodexAppMobile Android/1.0.0"
    const val enableWebDebug = false

    val allowedHosts = setOf(
        "codexapp.example.com",
    )

    val externalHosts = setOf(
        "github.com",
        "openai.com",
    )

    val allowedSchemes = setOf("https")
    val externalSchemes = setOf("mailto", "tel", "sms")
}
