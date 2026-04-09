# Docker Compose Deployment

## 文件说明

- `docker-compose.yml`: Compose 部署入口
- `.env.example`: 环境变量示例

## 快速开始

```bash
cd stack
cp .env.example .env
docker compose pull
docker compose up -d
```

启动后访问：

```text
http://127.0.0.1:8000/
```

## 持久化目录

- `codex_state` volume: 持久化 `/root/.codex`
- `codexapp_state` volume: 持久化 `/data/codexapp`
- `HOST_WORKSPACE_ROOT` bind mount: 挂载宿主机工作区到容器 `/workspace`

默认使用的是 Docker volume，因此数据会在容器重建或重启后保留，但不会自动复用宿主机现有的 `~/.codex`。如果你要直接复用宿主机已有的 Codex 登录状态和历史会话，可以把 `docker-compose.yml` 里的 `codex_state` volume 改成宿主机目录绑定挂载。

## 重要说明

- 远端镜像推荐使用 GitHub Actions 构建后推送到 GHCR；如果配置了 Docker Hub 凭据，也会同时推送到 Docker Hub，对应流程见 [../.github/workflows/docker-image.yml](/Users/kang_en/codex/codexapp/.github/workflows/docker-image.yml)
- `.env` 里的 `CODEXAPP_IMAGE_NAME` 需要改成你实际推送的镜像名，例如 `ghcr.io/<owner>/<repo>:latest` 或 `docker.io/<namespace>/<repository>:latest`
- 容器重启后，已完成的 Codex 会话和应用状态会保留，因为 `/root/.codex` 和 `/data/codexapp` 都被持久化了
- 容器重启时，正在执行中的 CLI 进程会中断，应用重启后会把这类运行标记为失败
- 容器内部不支持 macOS 的 Terminal/iTerm 打开会话能力
- 如果需要 Git push，请确保容器内可用认证方式，例如在 `/root/.codex` 中保留登录状态，或额外挂载 SSH 凭据
