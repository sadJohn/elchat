import { ElectronAPI } from '@electron-toolkit/preload'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatDelta {
  streamId: string
  content: string
}

export interface ChatError {
  streamId: string
  error: string
}

export interface ChatApi {
  start: (messages: ChatMessage[]) => Promise<string>
  abort: (streamId: string) => void
  onDelta: (cb: (e: ChatDelta) => void) => () => void
  onDone: (cb: (e: ChatDelta) => void) => () => void
  onError: (cb: (e: ChatError) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      chat: ChatApi
    }
  }
}
