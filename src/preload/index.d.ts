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

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface StoredMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface ChatApi {
  start: (payload: {
    conversationId: string
    messages: ChatMessage[]
    regenerate?: boolean
  }) => Promise<string>
  abort: (streamId: string) => void
  onDelta: (cb: (e: ChatDelta) => void) => () => void
  onDone: (cb: (e: ChatDelta) => void) => () => void
  onError: (cb: (e: ChatError) => void) => () => void
}

export interface ConversationsApi {
  list: () => Promise<Conversation[]>
  create: (title?: string) => Promise<Conversation>
  remove: (id: string) => Promise<void>
  messages: (id: string) => Promise<StoredMessage[]>
  rename: (id: string, title: string) => Promise<void>
}

export interface SettingsView {
  baseURL: string
  model: string
  proxy: string
  hasApiKey: boolean
  apiKeyMasked: string
}

export interface SettingsInput {
  baseURL: string
  model: string
  proxy: string
  apiKey?: string
}

export interface SettingsApi {
  get: () => Promise<SettingsView>
  save: (input: SettingsInput) => Promise<void>
}

export interface ExportApi {
  save: (payload: {
    content: string
    defaultName: string
    filterName: string
    extensions: string[]
  }) => Promise<string | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      chat: ChatApi
      conversations: ConversationsApi
      settings: SettingsApi
      export: ExportApi
    }
  }
}
