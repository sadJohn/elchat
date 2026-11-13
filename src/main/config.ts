import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { loadUiSettings } from './settings'

export interface AppConfig {
  apiKey: string
  baseURL: string
  model: string
  proxy?: string
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'

let cached: AppConfig | null = null

function readConfigFile(): Partial<AppConfig> {
  // 开发时优先读项目根 config.json；打包后读用户数据目录 config.json
  const candidates = [
    join(app.getAppPath(), 'config.json'),
    join(app.getPath('userData'), 'config.json')
  ]
  for (const file of candidates) {
    if (existsSync(file)) {
      try {
        return JSON.parse(readFileSync(file, 'utf-8')) as Partial<AppConfig>
      } catch (err) {
        console.error('[config] 无法解析配置文件:', file, err)
        return {}
      }
    }
  }
  return {}
}

export function loadConfig(): AppConfig {
  if (cached) return cached

  const file = readConfigFile()
  // 优先级：环境变量 > UI 设置（settings.json）> config.json（兜底）> 默认值
  const ui = loadUiSettings()

  cached = {
    apiKey: process.env.OPENAI_API_KEY ?? (ui.apiKey || file.apiKey || ''),
    baseURL: process.env.OPENAI_BASE_URL ?? (ui.baseURL || file.baseURL || DEFAULT_BASE_URL),
    model: process.env.OPENAI_MODEL ?? (ui.model || file.model || DEFAULT_MODEL),
    proxy: ui.proxy || file.proxy
  }

  return cached
}

export function reloadConfig(): void {
  cached = null
  loadConfig()
}

export function isConfigured(): boolean {
  return loadConfig().apiKey.length > 0
}
