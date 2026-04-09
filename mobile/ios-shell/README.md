# iOS Shell

这是 iOS 壳应用源码骨架目录。

当前已提供：

1. `WKWebView` 容器页
2. 导航白名单规则
3. 外链交给系统浏览器
4. 原生 loading / error overlay
5. `AppDelegate` / `SceneDelegate` 模板
6. `project.yml` 项目规格
7. `LaunchScreen.storyboard` 启动页资源

当前未提供：

1. `.xcodeproj`
2. 证书和签名配置
3. 真机构建设置
4. 多环境配置文件拆分

开始前需要替换：

- [ShellConfig.swift](/Users/kang_en/codex/codexapp/mobile/ios-shell/CodexApp/ShellConfig.swift)

本机验证结果：

1. `swiftc -typecheck` 已通过
2. `Info.plist` 已通过 `plutil -lint`
3. `LaunchScreen.storyboard` 已通过 `ibtool` 编译检查

建议后续步骤：

1. 使用 `xcodegen generate` 基于 [project.yml](/Users/kang_en/codex/codexapp/mobile/ios-shell/project.yml) 生成项目，或手动在 Xcode 中创建工程并纳入这些源码
2. 替换正式域名、Bundle ID、应用图标
3. 真机验证 Cookie、WebSocket、外链跳转
