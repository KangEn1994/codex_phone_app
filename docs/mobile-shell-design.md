# 移动端壳应用方案设计

## 分支信息

- 方案分支：`feature/mobile-shell-plan`
- 当前阶段：仅做方案设计，不进入 Android / iOS 实装

## 范围确认

本方案按下面的边界执行：

- Android 和 iOS 只负责承载前端页面壳
- 移动端与 Web 端共用同一套后端接口和业务逻辑
- 不讨论把 FastAPI、Codex CLI、会话存储搬到手机本地运行
- 不在本阶段改造后端架构

## 目标

在尽量不改动现有 Web 端业务逻辑的前提下，新增 Android 和 iOS 客户端能力。

核心原则：

1. 现有页面、接口、会话逻辑尽量原样复用。
2. 移动端先做“壳”，不先做“双端重写”。
3. Web 改动只允许出现在兼容层和体验增强层，不碰核心业务流。

## 现状评估

当前项目不是前后端分离 SPA，而是：

- FastAPI 服务端
- `templates/index.html` 单入口模板
- `static/app.js` 单文件前端逻辑
- `static/styles.css` 单文件样式
- Cookie 鉴权 + 同源 `fetch`
- 同源 WebSocket 实时事件流

这意味着：

1. 当前 Web 逻辑高度集中，适合直接复用页面。
2. 当前前端依赖“页面与 API 同源”这一前提。
3. 当前产品本质上是服务端驱动，不适合在手机本地离线运行。
4. 现有后端强依赖本机 `codex` CLI、文件系统、工作区目录和宿主能力，移动端不能直接把后端搬到手机上运行。

结论：移动端应优先定位为“前端页面壳 + 复用现有后端接口”的 App，而不是“在移动端重建一套前后端”。

## 推荐方案

### 方案结论

一期推荐采用：

- Android：原生 `WebView` 壳
- iOS：原生 `WKWebView` 壳
- 页面来源：加载部署后的前端页面
- 接口来源：继续调用现有后端 API / WebSocket
- Web 侧：只做极少量移动兼容改造

不推荐一期直接采用“Capacitor + 远程 URL”作为正式生产方案，原因是 Capacitor 官方文档将 `server.url` 明确标注为主要面向 live reload，而非生产发布场景。

### 为什么推荐原生 WebView 壳

这个项目当前最强的资产不是“可打包的前端工程”，而是“已经能工作的 Web 应用”。

如果目标是尽量不动原有 Web 逻辑，原生 WebView 壳的收益最高：

- 不需要先把 FastAPI 模板体系改造成独立前端构建产物
- 不需要先重写成 React Native / Flutter 页面
- 可以保持现有 `fetch`、Cookie、WebSocket 访问模型
- iOS 和 Android 壳层代码会很薄，维护面可控
- 后续如果确实需要原生能力，再逐步通过 JS bridge 注入

## 为什么不推荐的一期方案

### 1. 不推荐：React Native / Flutter 全量重写

问题：

- 直接失去“尽量不改 Web 逻辑”的前提
- 前端需要重做页面、状态管理、WebSocket、鉴权和交互
- 方案风险和工期都明显上升

适用时机：

- 未来确认要做大量原生交互
- 需要脱离 Web 页面独立演进

### 2. 不推荐：Capacitor 直接远程加载生产站点

Capacitor 非常适合“把现有 Web App 变成 App”，但它更适合有可打包 Web 资源目录的前端工程。

当前仓库不是这种结构；如果用 Capacitor 远程加载站点，就会落到 `server.url` 路径。根据 Capacitor 官方配置文档和 Live Reload 文档，这个能力主要用于开发调试，不建议作为生产正式方案。

结论：

- Capacitor 可以作为二期增强方案
- 不应作为当前壳应用正式生产落地的一期基础

## 一期建议架构

### 总体架构

```text
Android App / iOS App
        ↓
原生 WebView / WKWebView
        ↓
CodexApp 前端页面
        ↓
现有 FastAPI API / WebSocket
        ↓
现有后端业务逻辑
```

### 关键点

1. App 不承载核心业务逻辑，只承载前端页面。
2. 会话、消息、运行状态、设置仍由现有后端负责。
3. App 只补齐以下原生能力：
   - 启动页
   - 网络异常页
   - 基础导航控制
   - 外链打开策略
   - 可选的推送、分享、文件导出、深链

## 对现有 Web 的最小改动建议

以下改动属于“兼容层”，不改变现有业务逻辑。

### P0：必须做

1. 鉴权 Cookie 生产化
   - 当前登录接口写 Cookie 时 `secure=False`
   - 如果移动端加载 HTTPS 前端页面，生产环境应改为按环境启用 `Secure`
   - 否则会影响正式环境安全性

2. 移动端能力识别
   - 增加简单客户端识别方式
   - 可选方式：
     - `User-Agent` 追加 `CodexAppMobile`
     - 约定查询参数，如 `?client=mobile`
     - 注入一个只读 JS 标记
   - 作用：让 Web 页面按需隐藏桌面专属能力

3. 隐藏或禁用桌面专属入口
   - 当前“终端打开”是 macOS 宿主能力，不适用于移动端
   - 在移动端壳中应隐藏或替换为说明文案

4. 移动端安全区适配
   - 当前页面已经有 `viewport-fit=cover`
   - 仍建议补 `safe-area-inset-*` 相关样式
   - 避免 iPhone 刘海区、底部手势区遮挡

### P1：建议做

1. 新会话表单移动化
   - 当前 `cwd` 是手填路径
   - 在手机上不适合输入服务器绝对路径
   - 建议改为基于已有 `/api/projects` 的选择器
   - 这属于 UI 优化，不影响后端逻辑

2. 外链与新窗口策略
   - WebView 中对外部链接应统一转系统浏览器
   - 避免页面跳离主站点

3. 网络错误页
   - 对加载失败、证书异常、超时做统一反馈

### P2：可选增强

1. 原生推送通知
2. 深链直达某个会话
3. 分享当前会话
4. 生物识别二次解锁

## 客户端壳层建议职责

### Android

- 使用原生 `WebView`
- 只允许访问白名单域名
- 拦截外链并转系统浏览器
- 可增加下载、上传、分享桥接

### iOS

- 使用原生 `WKWebView`
- 配置受控导航和域名白名单
- 拦截外链并转系统浏览器
- 如后续需要，再通过 message handler 增加桥接

## 鉴权与网络策略

### 推荐策略

1. 前端页面与 API 保持同域
2. App 只加载 HTTPS 正式域名
3. Cookie 会话继续沿用现有模式
4. WebSocket 继续走同域 `wss://`

### 为什么不建议一期拆成“本地页面 + 远程 API”

因为当前前端默认：

- `fetch` 使用 `credentials: "same-origin"`
- WebSocket 直接取 `window.location.host`
- 鉴权依赖 Cookie

如果做成本地页面加远程 API，会立刻引入：

- 跨域
- Cookie 策略变化
- WebSocket 鉴权变化
- CORS 配置
- 更复杂的环境区分

这会明显抬高改造量，不符合“尽量不动原有 Web 逻辑”的目标。

## 建议的项目结构

建议不要把移动端壳代码塞进现有 `app/` 或 `static/` 逻辑里，而是单独隔离：

```text
docs/
  mobile-shell-design.md
mobile/
  ios-shell/
  android-shell/
```

说明：

- Web 仍由当前仓库主逻辑维护
- 移动端壳独立管理
- 后续如需 CI、证书、商店配置，也不会污染现有 Web 目录

## 分阶段实施建议

### 阶段 0：方案确认

- 确认移动端定位是“远程控制台 App 壳”
- 确认正式访问域名
- 确认是否需要登录态长期保持
- 确认是否需要推送、分享、深链

### 阶段 1：最小可用版本

- 建 Android / iOS WebView 壳工程
- 连接正式测试环境
- 完成登录、会话列表、消息流、WebSocket 验证
- 隐藏“终端打开”等桌面能力
- 补安全区和小屏交互

### 阶段 2：体验增强

- 优化新建会话交互
- 增加加载态、离线态、错误页
- 增加原生分享、文件处理、通知

### 阶段 3：原生能力扩展

- 深链到会话
- 推送通知到运行状态
- 生物识别
- 更细粒度的 JS bridge

## 主要风险

1. 后端宿主依赖风险
   - 当前服务依赖服务器本机 `codex` CLI 和本地工作区
   - 因此移动端永远只是“远程控制台”，不是本地执行端

2. 移动端交互密度偏高
   - 当前页面信息密度较高
   - 手机上虽然能用，但需要局部交互压缩

3. 鉴权与 Cookie 配置
   - 正式发布必须切 HTTPS
   - Cookie 属性需要按生产环境收紧

4. 桌面功能迁移边界
   - “终端打开”这类功能在移动端无等价能力
   - 需要产品层面接受“移动端不提供”

## 最终建议

建议按下面的决策执行：

1. 一期走“原生 WebView 壳 + 远程 HTTPS Web 站点”。
2. Web 只做兼容层改造，不重写业务逻辑。
3. 移动端壳代码独立目录管理，不侵入现有 Web 主体。
4. 等一期稳定后，再评估是否引入 Capacitor 或更强原生桥接。

## 参考资料

- Capacitor Docs: https://capacitorjs.com/docs
- Capacitor Config (`server.url` 说明): https://capacitorjs.com/docs/config
- Capacitor Live Reload: https://capacitorjs.com/docs/guides/live-reload
- Capacitor Security: https://capacitorjs.com/docs/guides/security
- Apple `WKWebView`: https://developer.apple.com/documentation/webkit/wkwebview
- Android `WebView`: https://developer.android.com/reference/android/webkit/WebView
