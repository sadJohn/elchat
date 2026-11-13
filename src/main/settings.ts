import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// UI 设置（API Key 管理）：API Key 用 safeStorage 加密后落盘，
// baseURL / model / proxy 明文存储，渲染层只能拿到脱敏后的 Key。

export interface SettingsInput {
  baseURL: string
  model: string
  proxy: string
  apiKey?: string
}

export interface SettingsView {
  baseURL: string
  model: string
  proxy: string
  hasApiKey: boolean
  apiKeyMasked: string
}

interface StoredSettings {
  baseURL?: string
  model?: string
  proxy?: string
  apiKeyEnc?: string
}

function settingsFile(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function readStored(): StoredSettings {
  try {
    if (!existsSync(settingsFile())) return {}
    return JSON.parse(readFileSync(settingsFile(), 'utf-8')) as StoredSettings
  } catch (err) {
    console.error('[settings] 读取设置失败:', err)
    return {}
  }
}

function encrypt(key: string): string {
  // Linux 等平台可能无系统密钥环，降级为明文 base64（仍不暴露给渲染层）
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(key).toString('base64')
  }
  return Buffer.from(key, 'utf-8').toString('base64')
}

function decrypt(enc: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'))
  }
  return Buffer.from(enc, 'base64').toString('utf-8')
}

// 供 config.ts 合并配置使用（解密后的完整值）
export function loadUiSettings(): { apiKey: string; baseURL: string; model: string; proxy: string } {
  const s = readStored()
  return {
    apiKey: s.apiKeyEnc ? decrypt(s.apiKeyEnc) : '',
    baseURL: s.baseURL ?? '',
    model: s.model ?? '',
    proxy: s.proxy ?? ''
  }
}

// 供 IPC 返回给渲染层：Key 脱敏
export function getSettingsView(): SettingsView {
  const s = readStored()
  const apiKey = s.apiKeyEnc ? decrypt(s.apiKeyEnc) : ''
  return {
    baseURL: s.baseURL ?? '',
    model: s.model ?? '',
    proxy: s.proxy ?? '',
    hasApiKey: apiKey.length > 0,
    apiKeyMasked: apiKey ? `••••${apiKey.slice(-4)}` : ''
  }
}

export function saveSettings(input: SettingsInput): void {
  const prev = readStored()
  const next: StoredSettings = {
    baseURL: input.baseURL.trim(),
    model: input.model.trim(),
    proxy: input.proxy.trim() || undefined,
    apiKeyEnc: prev.apiKeyEnc
  }

  // 仅当传入非空 Key 时才更新（留空 = 保持原 Key 不变）
  const key = input.apiKey?.trim()
  if (key) {
    next.apiKeyEnc = encrypt(key)
  }

  writeFileSync(settingsFile(), JSON.stringify(next, null, 2))
}
