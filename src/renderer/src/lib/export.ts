import type { Message } from '../types'

function timestamp(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function toMarkdown(title: string, messages: Message[]): string {
  const lines: string[] = [`# ${title}`, '', `> 导出自 elchat · ${timestamp()}`, '']
  for (const m of messages) {
    lines.push(`## ${m.role === 'user' ? '用户' : '助手'}`, '', m.content, '')
  }
  return lines.join('\n').trimEnd() + '\n'
}

export function toJson(title: string, messages: Message[]): string {
  return (
    JSON.stringify(
      {
        title,
        exportedAt: new Date().toISOString(),
        messages: messages.map((m) => ({ role: m.role, content: m.content }))
      },
      null,
      2
    ) + '\n'
  )
}
