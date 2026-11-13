import { ipcMain, BrowserWindow, dialog } from 'electron'
import { randomUUID } from 'crypto'
import { writeFileSync } from 'fs'
import { streamChat, resetClient, type ChatMessage } from './openai'
import { isConfigured, reloadConfig } from '../config'
import { getSettingsView, saveSettings, type SettingsInput } from '../settings'
import {
  initStore,
  listConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  getMessages,
  addMessage,
  deleteLastAssistantMessage
} from '../store'

const activeStreams = new Map<string, AbortController>()

interface ChatStartPayload {
  conversationId: string
  messages: ChatMessage[]
  regenerate?: boolean
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
      throw new Error('尚未配置 API Key，请在右上角设置中填写')
    }

    const { conversationId, messages, regenerate } = payload

    const streamId = randomUUID()
    const controller = new AbortController()
    activeStreams.set(streamId, controller)

    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('无法获取窗口')

    if (regenerate) {
      // 重新生成：删除旧的最后一条 AI 回复，用户消息已在库中，不重复保存
      deleteLastAssistantMessage(conversationId)
    } else {
      // 保存最后一条用户消息
      const lastUser = [...messages].reverse().find((m) => m.role === 'user')
      if (lastUser) {
        addMessage(conversationId, { id: randomUUID(), role: 'user', content: lastUser.content })
      }
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

  // 设置（API Key 管理）
  ipcMain.handle('settings:get', () => getSettingsView())
  ipcMain.handle('settings:save', (_event, input: SettingsInput) => {
    saveSettings(input)
    reloadConfig()
    resetClient()
  })

  // 导出对话
  ipcMain.handle(
    'export:save',
    async (
      event,
      payload: { content: string; defaultName: string; filterName: string; extensions: string[] }
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) throw new Error('无法获取窗口')
      const result = await dialog.showSaveDialog(win, {
        defaultPath: payload.defaultName,
        filters: [{ name: payload.filterName, extensions: payload.extensions }]
      })
      if (result.canceled || !result.filePath) return null
      writeFileSync(result.filePath, payload.content, 'utf-8')
      return result.filePath
    }
  )

  ipcMain.on('chat:abort', (_event, streamId: string) => {
    activeStreams.get(streamId)?.abort()
    activeStreams.delete(streamId)
  })
}
