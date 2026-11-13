import { ipcMain, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { streamChat, type ChatMessage } from './openai'
import { isConfigured } from '../config'
import {
  initStore,
  listConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  getMessages,
  addMessage
} from '../store'

const activeStreams = new Map<string, AbortController>()

interface ChatStartPayload {
  conversationId: string
  messages: ChatMessage[]
}

export function registerChatIpc(): void {
  initStore()

  // 会话管理
  ipcMain.handle('conversations:list', () => listConversations())
  ipcMain.handle('conversations:create', (_event, title?: string) => createConversation(title))
  ipcMain.handle('conversations:delete', (_event, id: string) => deleteConversation(id))
  ipcMain.handle('conversations:rename', (_event, id: string, title: string) =>
    renameConversation(id, title)
  )
  ipcMain.handle('conversations:messages', (_event, id: string) => getMessages(id))

  // 流式对话
  ipcMain.handle('chat:start', async (event, payload: ChatStartPayload) => {
    if (!isConfigured()) {
      throw new Error('尚未配置 API Key，请在 config.json 中填写 apiKey')
    }

    const { conversationId, messages } = payload

    const streamId = randomUUID()
    const controller = new AbortController()
    activeStreams.set(streamId, controller)

    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('无法获取窗口')

    // 保存最后一条用户消息
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) {
      addMessage(conversationId, { id: randomUUID(), role: 'user', content: lastUser.content })
    }

    void streamChat(
      messages,
      {
        onDelta: (content) => {
          if (!win.isDestroyed()) {
            win.webContents.send('chat:delta', { streamId, content })
          }
        },
        onDone: (content) => {
          activeStreams.delete(streamId)
          addMessage(conversationId, { id: randomUUID(), role: 'assistant', content })
          if (!win.isDestroyed()) {
            win.webContents.send('chat:done', { streamId, content })
          }
        },
        onError: (message) => {
          activeStreams.delete(streamId)
          // 用户主动停止（abort）时不推送错误
          if (!controller.signal.aborted && !win.isDestroyed()) {
            win.webContents.send('chat:error', { streamId, error: message })
          }
        }
      },
      controller.signal
    )

    return streamId
  })

  ipcMain.on('chat:abort', (_event, streamId: string) => {
    activeStreams.get(streamId)?.abort()
    activeStreams.delete(streamId)
  })
}
