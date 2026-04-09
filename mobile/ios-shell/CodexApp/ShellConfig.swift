import Foundation

enum ShellConfig {
    static let baseWebURL = URL(string: "https://codexapp.example.com/")!
    static let userAgentSuffix = "CodexAppMobile iOS/1.0.0"
    static let allowedHosts: Set<String> = [
        "codexapp.example.com",
    ]
    static let externalHosts: Set<String> = [
        "github.com",
        "openai.com",
    ]
    static let allowedSchemes: Set<String> = [
        "https",
    ]
    static let externalSchemes: Set<String> = [
        "mailto",
        "tel",
        "sms",
    ]
}
