# elchat

一个基于 Electron + React + TypeScript 的 AI 对话桌面应用，支持流式输出、Markdown 渲染、多会话与本地持久化。

## 功能

- **流式输出**：AI 回复逐字流式显示，可随时停止生成
- **Markdown 渲染**：支持表格、列表、代码块等，代码语法高亮 + 一键复制
- **多会话管理**：侧边栏新建 / 切换 / 删除会话
- **重新生成 / 重试**：对最后一条回复一键重新生成，报错时重试
- **本地持久化**：会话与消息存入 SQLite（better-sqlite3），重启自动恢复
- **多后端支持**：通过 OpenAI 兼容接口接入 Gemini、OpenAI、DeepSeek 等
- **API Key 管理**：设置界面配置后端，Key 用系统级加密（safeStorage）存储，改后即时生效
- **对话导出**：导出当前会话为 Markdown / JSON 文件
- **图片 / 多模态输入**：支持粘贴或选择图片提问（需支持视觉的后端，如 Gemini）

## 技术栈

- Electron 44 + electron-vite
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- react-markdown + remark-gfm + rehype-highlight
- openai（OpenAI 兼容 SDK）+ undici（代理支持）
- better-sqlite3（本地存储）

## 项目结构

```
elchat/
├── src/
│   ├── main/                    # 主进程（Node）
│   │   ├── index.ts             # 窗口/生命周期，注册 IPC
│   │   ├── config.ts            # 合并配置（env > settings.json > config.json）
│   │   ├── settings.ts          # UI 设置读写，API Key 加密存储
│   │   ├── store.ts             # SQLite 存储层
│   │   └── chat/
│   │       ├── openai.ts        # OpenAI 兼容流式调用
│   │       └── ipc.ts           # IPC 处理
│   ├── preload/                 # 预加载脚本
│   │   ├── index.ts             # contextBridge 暴露 window.api
│   │   └── index.d.ts           # 类型声明
│   └── renderer/                # 渲染层（React）
│       └── src/
│           ├── App.tsx          # 主界面
│           ├── components/      # Sidebar / ChatMessage / Markdown / MessageInput / ui
│           ├── hooks/useChat.ts # 聊天与会话状态管理
│           └── lib/utils.ts
├── config.json                  # 本地配置（已 gitignore，含 API Key）
├── config.example.json          # 配置模板
└── electron.vite.config.ts
```

## 快速开始

### 安装

```bash
pnpm install
```

> 首次安装后会自动将原生模块（better-sqlite3）rebuild 到 Electron ABI。若缺失，手动执行 `pnpm exec electron-builder install-app-deps`。

### 配置

也可以在应用内右上角「设置」里直接配置（推荐），API Key 会加密存储、改后即时生效。`config.json` 作为首次启动的兜底。

```bash
cp config.example.json config.json
```

编辑 `config.json`：

| 字段 | 说明 | 示例 |
|---|---|---|
| `apiKey` | 后端 API Key | `AIza…`（Gemini）/ `sk-…`（OpenAI） |
| `baseURL` | OpenAI 兼容端点 | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `model` | 模型名 | `gemini-3.6-flash` / `gpt-4o-mini` |
| `proxy` | HTTP 代理（可选，无法直连时） | `http://127.0.0.1:7890` |

> 支持任意 OpenAI 兼容后端：Gemini 填 Gemini 的 baseURL，DeepSeek/通义等填对应兼容端点即可。

### 开发

```bash
pnpm dev
```

### 构建

```bash
pnpm build          # 仅编译
pnpm build:mac      # 打包 macOS 应用
pnpm build:win      # 打包 Windows 应用
pnpm build:linux    # 打包 Linux 应用
```

## 架构说明

应用采用 Electron 三进程架构，**API Key 只存在于主进程**，渲染层通过 preload 暴露的类型安全 IPC 通信，永远接触不到密钥。在设置界面保存的 Key 会用 `safeStorage`（macOS Keychain / Windows DPAPI）加密后存入 `userData/settings.json`，渲染层只能读取脱敏的后 4 位。

```
渲染层 (React)
  └─ window.api.chat.start({ conversationId, messages })
        │  contextBridge
        ▼
主进程 (Node)
  ├─ openai.ts  流式调用后端（stream: true，逐 token 推送）
  ├─ store.ts   SQLite 持久化会话与消息
  └─ ipc.ts     通过 webContents.send 推送 delta/done/error
```

IPC 通道：

- `chat:start` / `chat:abort` — 开始/停止流式对话
- `chat:delta` / `chat:done` / `chat:error` — 主进程 → 渲染层推送
- `conversations:list` / `create` / `delete` / `rename` / `messages` — 会话管理
- `settings:get` / `settings:save` — 读取/保存后端配置（Key 脱敏）
- `export:save` — 保存导出文件（Markdown / JSON）

## 常见问题

- **对话超时/无响应**：Electron 主进程请求不自动走系统代理，无法直连后端时需在 `config.json` 配置 `proxy`。
- **原生模块加载失败**：better-sqlite3 需匹配 Electron ABI，运行 `pnpm exec electron-builder install-app-deps` 重建。
