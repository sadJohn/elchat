export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  content: string
  images?: string[]
  streaming?: boolean
  error?: string
}

export interface Conversation {
  id: string
  title: string
  systemPrompt?: string
  createdAt: number
  updatedAt: number
}
