import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type ChatDelta = { streamId: string; content: string }
type ChatError = { streamId: string; error: string }

function subscribe<T>(channel: string, cb: (e: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api = {
  chat: {
    start: (payload: {
      conversationId: string
      messages: ChatMessage[]
      regenerate?: boolean
    }): Promise<string> => ipcRenderer.invoke('chat:start', payload),
    abort: (streamId: string): void => ipcRenderer.send('chat:abort', streamId),
    onDelta: (cb: (e: ChatDelta) => void): (() => void) => subscribe('chat:delta', cb),
    onDone: (cb: (e: ChatDelta) => void): (() => void) => subscribe('chat:done', cb),
    onError: (cb: (e: ChatError) => void): (() => void) => subscribe('chat:error', cb)
  },
  conversations: {
    list: (): Promise<unknown> => ipcRenderer.invoke('conversations:list'),
    create: (title?: string): Promise<unknown> => ipcRenderer.invoke('conversations:create', title),
    remove: (id: string): Promise<unknown> => ipcRenderer.invoke('conversations:delete', id),
    messages: (id: string): Promise<unknown> => ipcRenderer.invoke('conversations:messages', id),
    rename: (id: string, title: string): Promise<unknown> =>
      ipcRenderer.invoke('conversations:rename', id, title)
  },
  settings: {
    get: (): Promise<unknown> => ipcRenderer.invoke('settings:get'),
    save: (input: unknown): Promise<unknown> => ipcRenderer.invoke('settings:save', input)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
