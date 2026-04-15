# CliHub

[中文](./README.zh-CN.md) | [English](./README.en.md)

CliHub 是一个基于 Tauri 2 的桌面工作台，用来统一启动、管理和查看多个 CLI coding agent 会话。

## 主要功能

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

## 已接入 CLI

| CLI | npm 包 | 说明 |
| --- | --- | --- |
| Codex | `@openai/codex` | OpenAI CLI coding agent，支持自定义 Base URL。 |
| Claude Code | `@anthropic-ai/claude-code` | Anthropic 终端编码助手，支持官方登录和自定义 Base URL。 |
| Gemini CLI | `@google/gemini-cli` | Google Gemini 终端代理。 |
| OpenCode | `opencode-ai` | 开源 CLI coding agent，支持自定义 Provider 路由。 |

## 典型使用方式

1. 选择一个工作区。
2. 选择要启动的 CLI。
3. 如果本机未安装，对应 CLI 会先执行安装流程并显示日志。
4. 会话创建后自动启动，并在右侧真实终端中显示输出。
5. 可以在会话列表中直接停止或重新启动，无需进入单独页面处理。

## 配置与持久化说明

- 软件会优先读取系统已有配置，再叠加软件内保存的配置。
- 对 CLI 的自定义模型、URL、Key 不会直接覆盖电脑原有官方配置文件。
- 会话记录会保存在本地应用数据目录中，并带有备份恢复逻辑。

## 本地开发

```bash
npm ci
npm run tauri dev
```

## 本地打包

```bash
npm run tauri build
```
