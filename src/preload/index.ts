import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatDelta = { streamId: string; content: string }
type ChatError = { streamId: string; error: string }

const api = {
  chat: {
    start: (messages: ChatMessage[]): Promise<string> => ipcRenderer.invoke('chat:start', messages),
    abort: (streamId: string): void => ipcRenderer.send('chat:abort', streamId),

    onDelta: (cb: (e: ChatDelta) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, payload: ChatDelta): void => cb(payload)
      ipcRenderer.on('chat:delta', listener)
      return () => {
        ipcRenderer.removeListener('chat:delta', listener)
      }
    },

    onDone: (cb: (e: ChatDelta) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, payload: ChatDelta): void => cb(payload)
      ipcRenderer.on('chat:done', listener)
      return () => {
        ipcRenderer.removeListener('chat:done', listener)
      }
    },

    onError: (cb: (e: ChatError) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, payload: ChatError): void => cb(payload)
      ipcRenderer.on('chat:error', listener)
      return () => {
        ipcRenderer.removeListener('chat:error', listener)
      }
    }
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
