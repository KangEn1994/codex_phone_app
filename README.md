# CodexApp

CodexApp 是一个基于 FastAPI 的本地 Web 控制台，用来管理和查看 Codex CLI 会话。应用通过后端直接调用本机 `codex` 可执行文件，并读取 `~/.codex` 下的会话和配置数据。

## 功能概览

- 基于浏览器的登录和会话管理
- 创建、继续、取消 Codex CLI 会话
- 查看运行状态、消息历史和事件流
- 修改默认模型、推理强度、沙箱和审批策略
- 在 macOS 上将已有会话直接拉起到 Terminal 或 iTerm

## 运行前提

- Python 3.11+
- 本机已安装并可执行的 Codex CLI
- 当前用户可以读取和写入 `~/.codex`
- 允许访问需要操作的工作区目录

应用启动时会按下面的顺序寻找 Codex CLI：

1. `CODEXAPP_CODEX_BIN`
2. `/Applications/Codex.app/Contents/Resources/codex`
3. `PATH` 中的 `codex`

## Python 依赖

依赖列表见 [requirements.txt](/Users/kang_en/codex/codexapp/requirements.txt)。

安装示例：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 配置项

支持的环境变量如下：

- `CODEXAPP_CODEX_BIN`: 指定 Codex CLI 路径
- `CODEXAPP_CODEX_DIR`: 指定 Codex 数据目录，默认 `~/.codex`
- `CODEXAPP_SUPPORT_DIR`: 指定应用状态目录，默认 `<repo>/.codexapp`
- `CODEXAPP_DB_PATH`: 指定应用 SQLite 数据库路径
- `CODEXAPP_AUTH_STATE_FILE`: 指定登录密码状态文件路径
- `CODEXAPP_SESSION_COOKIE_SECURE`: 是否强制将登录 Cookie 标记为 `Secure`，未设置时会根据请求是否为 HTTPS 自动判断
- `CODEXAPP_USERNAME`: 登录用户名，默认 `admin`
- `CODEXAPP_PASSWORD`: 初始登录密码，默认 `codexapp-demo`
- `CODEXAPP_ALLOWED_ROOT`: 允许浏览和启动会话的工作区根目录，默认 `~/codex`
- `CODEXAPP_HOST`: 服务监听地址，脚本默认 `0.0.0.0`
- `CODEXAPP_PORT`: 服务监听端口，脚本默认 `8000`
- `CODEXAPP_PID_FILE`: 后台模式 PID 文件路径
- `CODEXAPP_LOG_FILE`: 后台模式日志文件路径

## 启动方式

前台启动：

```bash
source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

使用仓库自带脚本：

```bash
scripts/codexapp-server start
scripts/codexapp-server status
scripts/codexapp-server stop
scripts/codexapp-server foreground
```

启动后访问 `http://127.0.0.1:8000/`。

## 数据目录

- `~/.codex`: Codex CLI 自身的配置、状态库和会话数据
- `<repo>/.codexapp`: CodexApp 的 `settings.toml`、`app.db` 和运行日志

这两个目录都需要持久化，否则历史会话、认证状态和默认设置都会丢失。

## Docker 部署说明

当前实现不是天然面向容器部署，原因很直接：

- 后端执行会话时强依赖本机 `codex` CLI，而不是远程 API
- 应用需要读取并复用 `~/.codex` 中的配置、SQLite 状态和会话文件
- 运行时会尝试加载登录 shell 环境变量，以便 CLI 与宿主机环境保持一致
- “在终端中打开会话” 功能依赖 macOS `osascript`、Terminal 和 iTerm，容器内不可用
- 自带管理脚本默认绑定仓库内 `.venv/bin/python`，这是本机目录结构假设，不是镜像内约定

结论：

- 如果容器里同时安装 Codex CLI，并挂载宿主机的 `~/.codex`、工作区目录和持久化状态目录，基础 Web 功能可以运行
- 如果目标是标准化、可移植的 Docker 部署，当前方案并不理想，因为它本质上仍然依赖宿主机上的本地 CLI 运行模型
- 如果要把 Docker 作为正式部署方式，建议进一步改造为“容器内完整运行 Codex CLI”或“后端改为调用远程 API”，否则可移植性、权限和状态一致性都比较脆弱

仓库里已经补充了 Docker Compose 部署结构：

- [docker/Dockerfile](/Users/kang_en/codex/codexapp/docker/Dockerfile): 镜像构建文件，镜像内安装 Python 依赖和 Codex CLI
- [.github/workflows/docker-image.yml](/Users/kang_en/codex/codexapp/.github/workflows/docker-image.yml): GitHub Actions 远端构建并推送 GHCR 镜像，并可选同步推送到 Docker Hub
- [stack/docker-compose.yml](/Users/kang_en/codex/codexapp/stack/docker-compose.yml): Compose 部署入口
- [stack/.env.example](/Users/kang_en/codex/codexapp/stack/.env.example): 环境变量示例
- [stack/README.md](/Users/kang_en/codex/codexapp/stack/README.md): 部署说明

GitHub Actions 工作流默认行为：

- 推送到 `main` 时在 GitHub 远端构建镜像并推送到 `ghcr.io/<owner>/<repo>`
- 如果配置了 `DOCKERHUB_IMAGE_NAME`、`DOCKERHUB_USERNAME` 和 `DOCKERHUB_TOKEN`，同一次构建会额外推送到 `docker.io/<namespace>/<repository>`
- 推送 `v*` tag 时额外生成语义化版本标签
- 提交 PR 到 `main` 时只做构建校验，不推送镜像

Docker Hub 配置方式：

- 在 GitHub 仓库的 Variables 里可选新增 `DOCKERHUB_REGISTRY`，默认是 `docker.io`
- 在 GitHub 仓库的 Variables 里新增 `DOCKERHUB_IMAGE_NAME`，值可以是 `yourname/codexapp`，也可以是完整的 `docker.io/yourname/codexapp`
- 在 GitHub 仓库的 Secrets 里新增 `DOCKERHUB_USERNAME`
- 在 GitHub 仓库的 Secrets 里新增 `DOCKERHUB_TOKEN`
- `DOCKERHUB_TOKEN` 推荐使用 Docker Hub Access Token；如果你必须使用密码，也应放在这个 Secret 里

Compose 使用方式：

```bash
cd stack
cp .env.example .env
docker compose pull
docker compose up -d
```

默认会持久化两个关键目录：

- `/root/.codex`: 保存 Codex CLI 登录状态、配置和会话数据
- `/data/codexapp`: 保存 CodexApp 的 `app.db` 与 `settings.toml`

这意味着容器重启后，已完成的历史会话仍然可见；但正在执行中的任务进程会中断，应用重新启动后会把它们标记为失败。

## 安卓打包 CI

仓库里已经补充了 Android 壳应用打包工作流：

- [.github/workflows/mobile-packages.yml](/Users/kang_en/codex/codexapp/.github/workflows/mobile-packages.yml): 构建 Android 安装包产物
- [mobile/android-shell](/Users/kang_en/codex/codexapp/mobile/android-shell): Android 原生壳工程

工作流默认行为：

- 会产出带 UTC 时间戳的 `codexapp-android-debug-apk-<timestamp>`
- 会额外构建带 UTC 时间戳的 `codexapp-android-release-package-<timestamp>`
- debug 包文件名类似 `codexapp-android-debug-20260409-123456.apk`，最适合先做本地安装测试
- release 产物会同时包含 `.apk` 和 `.aab`

Android 可选签名 Secrets：

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

飞书通知可选 Secrets：

- `FEISHU_WEBHOOK_URL`: 飞书自定义机器人 webhook 地址
- `FEISHU_WEBHOOK_SECRET`: 如果机器人开启了签名校验，再额外配置这个 secret；未开启可不填

说明：

- 当前仓库还没有正式商店发布配置，所以这个 CI 更偏向“持续产出可验证安装包”
- 如果不配置签名参数，最适合直接拿 `debug APK` 本地安装测试
- Android 壳应用现在支持在应用内输入并保存远程 CodexApp 地址，不需要再把服务地址写死在代码里
- 如果配置了 `FEISHU_WEBHOOK_URL`，Android 打包 job 结束后会发送一张飞书卡片，包含构建状态、分支、触发人、运行链接、提交链接，以及两个 artifact 下载按钮

## 测试

运行测试：

```bash
python -m unittest discover -s tests -p 'test*.py'
```
