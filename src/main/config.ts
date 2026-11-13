import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

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

  cached = {
    apiKey: process.env.OPENAI_API_KEY ?? file.apiKey ?? '',
    baseURL: process.env.OPENAI_BASE_URL ?? file.baseURL ?? DEFAULT_BASE_URL,
    model: process.env.OPENAI_MODEL ?? file.model ?? DEFAULT_MODEL,
    proxy: file.proxy
  }

  return cached
}

export function isConfigured(): boolean {
  return loadConfig().apiKey.length > 0
}
