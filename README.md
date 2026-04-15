# CliHub

[中文](#中文) | [English](#english)

CliHub is a desktop workspace for running and managing multiple CLI coding agent sessions from one UI.

## 中文

CliHub 是一个基于 Tauri 2 的桌面工作台，用来统一启动、管理和查看多个 CLI coding agent 会话。

### 主要功能

- 多会话管理：在同一个窗口中管理多个会话，会话列表按工作区分组，并支持展开、收起、直接启动和停止。
- 真实命令终端：内嵌 xterm.js 终端，连接本机真实 PTY，会话创建后可直接输入本机命令，不是模拟输出。
- 多工具接入：当前已集成 `Codex`、`Claude Code`、`Gemini CLI`、`OpenCode`。
- 一键安装与修复：支持对已接入 CLI 执行安装、更新、修复、卸载，并实时显示安装日志和进度输出。
- 配置管理：可为每个 CLI 配置 `Provider URL`、`API Key`、`Model`、`Runtime Profile`、`Node Provider`。
- 继承系统配置：会读取电脑里已有的环境变量和官方配置文件，并在界面中显示配置来源，减少重复配置。
- 隔离运行目录：每个会话使用应用自己的运行目录生成临时配置，避免直接改写电脑原有 CLI 配置。
- 会话持久化：关闭软件后保留会话历史；如果关闭前会话处于运行中或启动中，下次打开会自动标记为已停止。
- 环境诊断：内置平台、系统 Node、托管 Node、Docker 状态检测。
- 托管 Node：支持使用应用托管的 Node 运行 CLI，也支持切换为系统 Node。
- 多运行时：Windows 下支持 `PowerShell`、`Git Bash`、`WSL`，macOS 下支持 `zsh`。
- 多窗口：支持新建多个工作窗口。
- 外观设置：支持简体中文、繁体中文、英文；支持深色/浅色主题；支持界面字体和终端字体、字号设置。
- 自定义标题栏：提供 `文件`、`窗口`、`帮助` 菜单，以及最小化、最大化、关闭按钮。
- GitHub 云端构建：仓库已内置 GitHub Actions，可直接在 GitHub 上生成 Windows 和 macOS 版本。

### 已接入 CLI

| CLI | npm 包 | 说明 |
| --- | --- | --- |
| Codex | `@openai/codex` | OpenAI CLI coding agent，支持自定义 Base URL。 |
| Claude Code | `@anthropic-ai/claude-code` | Anthropic 终端编码助手，支持官方登录和自定义 Base URL。 |
| Gemini CLI | `@google/gemini-cli` | Google Gemini 终端代理。 |
| OpenCode | `opencode-ai` | 开源 CLI coding agent，支持自定义 Provider 路由。 |

### 典型使用方式

1. 选择一个工作区。
2. 选择要启动的 CLI。
3. 如果本机未安装，对应 CLI 会先执行安装流程并显示日志。
4. 会话创建后自动启动，并在右侧真实终端中显示输出。
5. 可以在会话列表中直接停止或重新启动，无需进入单独页面处理。

### 配置与持久化说明

- 软件会优先读取系统已有配置，再叠加软件内保存的配置。
- 对 CLI 的自定义模型、URL、Key 不会直接覆盖电脑原有官方配置文件。
- 会话记录会保存在本地应用数据目录中，并带有备份恢复逻辑。

### GitHub 构建

仓库包含 `.github/workflows/publish.yml`，支持以下构建目标：

- Windows x64
- macOS Intel
- macOS Apple Silicon

触发方式：

- 推送形如 `v0.1.5` 的 tag
- 在 GitHub Actions 页面手动运行 `publish`

生成的安装包和应用包会上传到对应的 GitHub Release。

### 本地开发

```bash
npm ci
npm run tauri dev
```

### 本地打包

```bash
npm run tauri build
```

## English

CliHub is a Tauri 2 desktop workspace for launching, managing, and viewing multiple CLI coding agent sessions in one place.

### Core Features

- Multi-session management: manage multiple sessions in one window, grouped by workspace, with direct start and stop controls.
- Real terminal embedding: uses xterm.js with a real local PTY, so session output and input go to actual local processes.
- Multi-tool support: currently integrates `Codex`, `Claude Code`, `Gemini CLI`, and `OpenCode`.
- One-click install and repair: install, update, repair, or uninstall supported CLIs with live progress and log output.
- Tool configuration: configure `Provider URL`, `API Key`, `Model`, `Runtime Profile`, and `Node Provider` per CLI.
- System config inheritance: detects existing environment variables and official local config files, and shows where effective values come from.
- Isolated runtime directories: each session can use app-managed runtime config instead of overwriting your original CLI setup.
- Session persistence: session history is preserved across restarts; sessions that were running when the app closed are normalized back to `stopped`.
- Environment diagnostics: built-in checks for platform, system Node, managed Node, and Docker availability.
- Managed Node support: run tools with an app-managed Node runtime or switch to the system Node installation.
- Multiple runtime profiles: supports `PowerShell`, `Git Bash`, and `WSL` on Windows, and `zsh` on macOS.
- Multi-window workflow: open more than one workspace window.
- Appearance settings: supports Simplified Chinese, Traditional Chinese, and English, plus dark/light themes and separate UI/terminal font settings.
- Custom title bar: includes `File`, `Window`, and `Help` menus with custom minimize, maximize, and close controls.
- GitHub cloud builds: the repo includes GitHub Actions for building Windows and macOS releases in the cloud.

### Supported CLI Tools

| CLI | npm package | Notes |
| --- | --- | --- |
| Codex | `@openai/codex` | OpenAI CLI coding agent with custom Base URL support. |
| Claude Code | `@anthropic-ai/claude-code` | Anthropic terminal coding assistant with official login and custom Base URL support. |
| Gemini CLI | `@google/gemini-cli` | Google's terminal agent for Gemini workflows. |
| OpenCode | `opencode-ai` | Open-source coding agent with flexible provider routing. |

### Typical Workflow

1. Choose a workspace.
2. Pick the CLI you want to run.
3. If the CLI is missing, CliHub installs it first and shows live logs.
4. The session starts automatically and streams output into the embedded terminal.
5. You can stop or restart the session directly from the session list.

### Config and Persistence

- CliHub merges system-level config with app-saved config.
- Custom model, URL, or key settings do not directly overwrite your original official CLI config files.
- Session data is stored in the local app data directory with backup-based recovery logic.

### GitHub Builds

The repository includes `.github/workflows/publish.yml` with these build targets:

- Windows x64
- macOS Intel
- macOS Apple Silicon

Triggers:

- Push a tag such as `v0.1.5`
- Run `publish` manually from GitHub Actions

Generated installers and app bundles are uploaded to the matching GitHub Release.

### Local Development

```bash
npm ci
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```
