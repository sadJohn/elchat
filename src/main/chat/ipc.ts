import { ipcMain, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { streamChat, type ChatMessage } from './openai'
import { isConfigured } from '../config'

const activeStreams = new Map<string, AbortController>()

export function registerChatIpc(): void {
  ipcMain.handle('chat:start', async (event, messages: ChatMessage[]) => {
    if (!isConfigured()) {
      throw new Error('尚未配置 API Key，请在 config.json 中填写 apiKey')
    }

    const streamId = randomUUID()
    const controller = new AbortController()
    activeStreams.set(streamId, controller)

    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('无法获取窗口')

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
