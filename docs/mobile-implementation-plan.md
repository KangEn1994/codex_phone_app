# 移动端壳应用实施计划

## 适用范围

本计划仅覆盖：

- Android 壳应用
- iOS 壳应用
- 与现有前端页面的承载关系
- 与现有后端 API / WebSocket 的对接方式

本计划不覆盖：

- FastAPI 后端重构
- Codex CLI 运行逻辑调整
- 移动端本地化业务实现

## 项目目标

在不重写现有 Web 核心业务逻辑的前提下，交付：

1. 一个可发布的 Android 壳应用
2. 一个可发布的 iOS 壳应用
3. 一组最小化的 Web 兼容改造

## 工程策略

### 总策略

- 移动端只负责承载页面
- 现有后端继续作为唯一业务入口
- App 只做“容器层”和“原生增强层”

### 容器层职责

- 加载前端页面
- 维护基础导航
- 控制域名白名单
- 处理外链跳转
- 展示加载态和异常页

### 原生增强层职责

- 启动页
- 网络异常提示
- 分享能力
- 深链
- 通知

一期只做容器层，原生增强层只保留扩展位。

## 推荐目录

```text
docs/
  mobile-shell-design.md
  mobile-implementation-plan.md
  mobile-web-adaptation-checklist.md
mobile/
  android-shell/
    README.md
  ios-shell/
    README.md
```

说明：

- `docs/` 放设计和实施文档
- `mobile/android-shell/` 后续放 Android 原生工程
- `mobile/ios-shell/` 后续放 iOS 原生工程

## Android 方案

### 推荐技术

- 原生 Kotlin
- Android WebView
- 单 Activity 为主

### 一期结构建议

```text
android-shell/
  app/
    src/main/
      java/.../
        MainActivity
        WebViewHost
        NavigationPolicy
      res/
        layout/
        values/
```

### Android 一期能力

1. 启动即打开指定 HTTPS 页面
2. 允许同域 Cookie、Session、WebSocket
3. 仅允许白名单域名继续留在 WebView 内
4. 非白名单外链转系统浏览器
5. 返回键优先回退 WebView 历史
6. 提供统一加载态和错误态

### Android 暂不做

- 原生多页面导航体系
- 本地离线缓存业务页
- 独立原生登录页
- 本地数据库承载业务状态

## iOS 方案

### 推荐技术

- 原生 Swift
- WKWebView
- 单 Scene / 单主容器页

### 一期结构建议

```text
ios-shell/
  CodexApp/
    AppDelegate / SceneDelegate
    WebContainerViewController
    NavigationPolicy
    Assets.xcassets
```

### iOS 一期能力

1. 启动即打开指定 HTTPS 页面
2. 允许同域 Cookie、Session、WebSocket
3. 仅允许白名单域名在 WKWebView 内继续访问
4. 非白名单外链转 Safari
5. 提供统一加载态和错误态

### iOS 暂不做

- 原生 TabBar/Navigation 业务结构
- 本地账号体系
- 离线业务缓存

## 环境策略

### 域名策略

建议至少区分：

1. `dev`
2. `staging`
3. `prod`

每个环境都要明确：

- 页面入口 URL
- API 域名
- WebSocket 域名
- 白名单跳转域名

理想状态是三者同域或同主域。

### 配置注入策略

移动端壳不要把 URL 写死在页面逻辑里，应在壳工程内配置：

- `BASE_WEB_URL`
- `ALLOWED_HOSTS`
- `EXTERNAL_LINK_HOSTS`

这样后续切环境不需要改页面代码。

## 与 Web 的协作约定

### 页面来源约定

移动端加载的必须是正式可访问页面，而不是本地开发地址。

### 页面行为约定

Web 页面需要能识别“当前运行在移动壳中”，用于：

- 隐藏桌面专属功能
- 调整部分布局和交互
- 控制外链打开方式

推荐识别方式：

1. App 自定义 User-Agent
2. 页面 URL 附带 `client=mobile`

一期建议优先用 User-Agent，侵入更小。

## 关键交互边界

### 登录

- 继续使用当前 Web 登录页
- 继续使用当前 Cookie 会话
- 不单独做原生登录

### 会话列表

- 完全复用现有 Web 页面
- 仅针对小屏优化布局

### 消息流

- 完全复用当前 WebSocket 机制
- 移动端不接管消息状态管理

### 新建会话

- 复用当前页面逻辑
- 需要补移动端更适合的项目选择交互

### 终端打开

- 移动端直接隐藏或禁用
- 不做能力映射

## 阶段划分

### 阶段 0：准备

目标：

- 确认产品边界
- 确认环境域名
- 确认发布方式

输出：

- 最终域名表
- 移动端包名和应用名
- Android / iOS 最低系统版本

### 阶段 1：容器 MVP

目标：

- 壳应用可运行
- 可登录
- 可查看会话
- 可实时收消息

交付标准：

1. Android 和 iOS 都能成功加载入口页
2. 登录成功后 Cookie 能保持
3. 会话列表和消息流可正常工作
4. WebSocket 在移动网络和 Wi-Fi 下可恢复
5. 外链不会意外离开主页面

### 阶段 2：移动适配

目标：

- 页面可在手机上稳定使用
- 关键路径更顺手

交付标准：

1. 安全区无遮挡
2. 小屏下布局可读
3. 新建会话流程可用
4. 桌面专属按钮已处理

### 阶段 3：原生增强

目标：

- 增加移动端专属体验

候选能力：

- 深链到某个会话
- 系统分享
- 推送通知
- 生物识别

## 验收清单

### 基础验收

1. App 首屏加载成功率达标
2. 登录后 8 小时内会话有效
3. 页面刷新或重进后登录态可恢复
4. 消息列表和运行状态显示正常
5. WebSocket 断开后可重连

### 安全验收

1. 仅允许 HTTPS
2. 仅允许白名单域名留在容器内
3. Cookie 按生产环境收紧
4. 非白名单链接跳系统浏览器

### 体验验收

1. iPhone 刘海区无遮挡
2. Android 返回键行为符合预期
3. 输入框聚焦时页面不明显错位
4. 网络异常时有明确提示

## 风险与对策

### 风险 1：页面过于桌面化

对策：

- 优先改关键路径
- 不追求一次性全页面精细重排

### 风险 2：Cookie / WebSocket 兼容问题

对策：

- 统一 HTTPS
- 提前在真机和弱网环境验证

### 风险 3：用户误以为 App 支持本地运行

对策：

- 产品说明明确“远程控制台”定位
- 异常页提示网络和服务状态

## 建议的开发顺序

1. 先完成 Web 兼容层清单确认
2. 再搭 Android / iOS 容器骨架
3. 优先打通登录、会话列表、消息流
4. 最后补体验和原生增强
