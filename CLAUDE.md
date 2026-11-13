# CLAUDE.md

本文件为 AI 助手提供项目上下文，方便快速理解并继续开发。

## 项目概述

elchat 是一个 Electron + React + TypeScript 的 AI 对话桌面应用。核心能力：流式对话、Markdown 渲染（代码高亮 + 复制）、多会话、SQLite 本地持久化，通过 OpenAI 兼容接口支持 Gemini / OpenAI / DeepSeek 等任意后端。

## 架构与数据流

三进程结构（electron-vite 构建）：

- **主进程** `src/main/`：持有 API Key，调用后端流式接口，操作 SQLite，注册 IPC。
- **preload** `src/preload/`：用 `contextBridge` 暴露 `window.api`（类型在 `index.d.ts`）。
- **渲染层** `src/renderer/src/`：React 19 + Tailwind v4 + shadcn/ui，通过 `window.api` 通信。

对话链路：渲染层 `chat.start({ conversationId, messages })` → 主进程 `openai.ts` 用 `openai` SDK `stream: true` 逐 token 读取 → `ipc.ts` 通过 `webContents.send('chat:delta'|'chat:done'|'chat:error')` 推送 → 渲染层 `useChat` 增量渲染。

## 关键文件

| 文件 | 职责 |
|---|---|
| `src/main/config.ts` | 读取 `config.json`（apiKey / baseURL / model / proxy） |
| `src/main/chat/openai.ts` | OpenAI 兼容流式调用 + 错误转中文；代理用 undici `ProxyAgent` |
| `src/main/chat/ipc.ts` | 全部 IPC 处理 + 消息落库 |
| `src/main/store.ts` | SQLite schema 与 CRUD（`conversations` / `messages` 表） |
| `src/renderer/src/hooks/useChat.ts` | 会话列表 + 流式状态管理（核心状态逻辑） |
| `src/renderer/src/components/` | Sidebar / ChatMessage / Markdown / MessageInput / ui |

## 关键约定与坑

1. **API Key 只在主进程**，绝不下发到渲染层。配置来自项目根 `config.json`（已 gitignore）。
2. **Electron 主进程网络请求不自动走系统代理**。用户无法直连后端时，需在 `config.json` 配 `proxy` 字段，`openai.ts` 用 undici `ProxyAgent` 走代理。
3. **better-sqlite3 是原生模块**，必须匹配 Electron ABI：`pnpm exec electron-builder install-app-deps` 重建。
4. **渲染层路径别名**：`@` → `src/renderer/src`（electron.vite.config.ts 与 tsconfig.web.json 两处都要配）。
5. **数据库文件**在 `app.getPath('userData')/elchat.db`，WAL 模式；schema 见 `store.ts`。
6. **IPC 通道前缀**：`chat:*` 与 `conversations:*`；preload 里 `subscribe()` 统一封装事件订阅。
7. **开发环境坑**：在 VSCode/Electron 集成终端跑 `pnpm dev` 若报 `Cannot read properties of undefined (reading 'isPackaged')`，先 `unset ELECTRON_RUN_AS_NODE`（该环境变量会让 Electron 以纯 Node 模式启动）。
8. Gemini 模型名会随版本停用（如 `gemini-2.5-flash` 已停用，当前可用 `gemini-3.6-flash`），换模型只改 `config.json` 的 `model`。

## 常用命令

```bash
pnpm dev          # 开发（热重载）
pnpm build        # 编译（typecheck + electron-vite build）
pnpm typecheck    # 类型检查
pnpm lint         # ESLint
pnpm exec electron-builder install-app-deps  # 重建原生模块到 Electron ABI
```

## 提交规范

个人项目，直接在功能分支（如 `feat/ai-chat`）提交，commit message 用中文 `feat:` / `fix:` 前缀。
