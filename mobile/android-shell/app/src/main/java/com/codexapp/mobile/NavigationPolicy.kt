package com.codexapp.mobile

import android.net.Uri

enum class NavigationDecision {
    InApp,
    External,
    Blocked,
}

object NavigationPolicy {
    fun evaluate(uri: Uri?): NavigationDecision {
        if (uri == null) {
            return NavigationDecision.Blocked
        }

        val scheme = (uri.scheme ?: "").lowercase()
        val host = (uri.host ?: "").lowercase()

        if (scheme in ShellConfig.externalSchemes) {
            return NavigationDecision.External
        }
        if (scheme !in ShellConfig.allowedSchemes) {
            return NavigationDecision.Blocked
        }
        if (host in ShellConfig.allowedHosts) {
            return NavigationDecision.InApp
        }
        if (host in ShellConfig.externalHosts) {
            return NavigationDecision.External
        }
        return NavigationDecision.Blocked
    }
}
