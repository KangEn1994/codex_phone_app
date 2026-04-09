# Android Shell

这是 Android 壳应用骨架目录。

当前已提供：

1. Gradle 基础文件
2. Gradle wrapper
3. `WebView` 主容器页
4. 启动时可输入并保存远程服务地址
5. 域名白名单导航策略
6. 外链跳系统浏览器逻辑
7. 原生加载态和错误态骨架
8. 支持测试环境使用 HTTP 明文地址

当前未提供：

1. 正式签名配置
2. 商店发布配置
3. 多环境自动切换脚本

开始前建议确认：

- [ShellConfig.kt](/Users/kang_en/codex/codexapp/mobile/android-shell/app/src/main/java/com/codexapp/mobile/ShellConfig.kt) 里的默认地址、额外外链域名和调试开关

本机验证结果：

1. `./gradlew --version` 已通过
2. `./gradlew :app:assembleDebug` 在当前机器失败
3. 失败原因是当前环境只有 `JDK 25`，Android Gradle 链路需要兼容的 `JDK 17/21`

建议后续步骤：

1. 替换默认地址占位值和正式包名
2. 真机验证 Cookie、WebSocket、外链跳转
3. 使用兼容的 JDK 17/21 继续完整构建
