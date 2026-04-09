import Foundation

enum NavigationDecision {
    case inApp
    case external
    case blocked
}

enum NavigationPolicy {
    static func evaluate(_ url: URL?) -> NavigationDecision {
        guard let url else {
            return .blocked
        }

        let scheme = (url.scheme ?? "").lowercased()
        let host = (url.host ?? "").lowercased()

        if ShellConfig.externalSchemes.contains(scheme) {
            return .external
        }
        guard ShellConfig.allowedSchemes.contains(scheme) else {
            return .blocked
        }
        if ShellConfig.allowedHosts.contains(host) {
            return .inApp
        }
        if ShellConfig.externalHosts.contains(host) {
            return .external
        }
        return .blocked
    }
}
