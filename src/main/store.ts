import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface Conversation {
  id: string
  title: string
  systemPrompt?: string
  createdAt: number
  updatedAt: number
}

export interface StoredMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  createdAt: number
}

let db: Database.Database | null = null

export function initStore(): void {
  if (db) return

  const file = join(app.getPath('userData'), 'elchat.db')
  db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      system_prompt TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      images TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages(conversation_id, created_at);
  `)

  // 迁移：为旧库补充 images 列
  const cols = db.prepare('PRAGMA table_info(messages)').all() as Array<{ name: string }>
  if (!cols.some((c) => c.name === 'images')) {
    db.exec('ALTER TABLE messages ADD COLUMN images TEXT')
  }

  // 迁移：为旧库补充 system_prompt 列
  const convCols = db.prepare('PRAGMA table_info(conversations)').all() as Array<{ name: string }>
  if (!convCols.some((c) => c.name === 'system_prompt')) {
    db.exec("ALTER TABLE conversations ADD COLUMN system_prompt TEXT NOT NULL DEFAULT ''")
  }
}

function getDb(): Database.Database {
  if (!db) initStore()
  return db as Database.Database
}

export function listConversations(): Conversation[] {
  const rows = getDb()
    .prepare(
      'SELECT id, title, system_prompt, created_at, updated_at FROM conversations ORDER BY updated_at DESC'
    )
    .all() as Array<{
    id: string
    title: string
    system_prompt: string
    created_at: number
    updated_at: number
  }>

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    systemPrompt: r.system_prompt,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }))
}

export function createConversation(title = '新对话', systemPrompt = ''): Conversation {
  const now = Date.now()
  const conv: Conversation = {
    id: randomUUID(),
    title,
    systemPrompt,
    createdAt: now,
    updatedAt: now
  }
  getDb()
    .prepare(
      'INSERT INTO conversations (id, title, system_prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(conv.id, conv.title, systemPrompt, conv.createdAt, conv.updatedAt)
  return conv
}

export function deleteConversation(id: string): void {
  getDb().prepare('DELETE FROM conversations WHERE id = ?').run(id)
}

export function renameConversation(id: string, title: string): void {
  getDb()
    .prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, Date.now(), id)
}

export function updateSystemPrompt(id: string, systemPrompt: string): void {
  getDb()
    .prepare('UPDATE conversations SET system_prompt = ?, updated_at = ? WHERE id = ?')
    .run(systemPrompt, Date.now(), id)
}

export function getMessages(conversationId: string): StoredMessage[] {
  const rows = getDb()
    .prepare(
      'SELECT id, conversation_id, role, content, images, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    )
    .all(conversationId) as Array<{
    id: string
    conversation_id: string
    role: string
    content: string
    images: string | null
    created_at: number
  }>

  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role as 'user' | 'assistant',
    content: r.content,
    images: r.images ? (JSON.parse(r.images) as string[]) : undefined,
    createdAt: r.created_at
  }))
}

export function addMessage(
  conversationId: string,
  message: { id: string; role: 'user' | 'assistant'; content: string; images?: string[] }
): void {
  const database = getDb()
  const isFirst =
    (
      database
        .prepare('SELECT COUNT(*) AS c FROM messages WHERE conversation_id = ?')
        .get(conversationId) as { c: number }
    ).c === 0

  database
    .prepare(
      'INSERT INTO messages (id, conversation_id, role, content, images, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      message.id,
      conversationId,
      message.role,
      message.content,
      message.images ? JSON.stringify(message.images) : null,
      Date.now()
    )

  database
    .prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
    .run(Date.now(), conversationId)

  // 第一条用户消息自动作为会话标题
  if (isFirst && message.role === 'user') {
    const title = message.content.replace(/\s+/g, ' ').trim().slice(0, 24) || '新对话'
    database.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(title, conversationId)
  }
}

export function deleteLastAssistantMessage(conversationId: string): void {
  getDb()
    .prepare(
      "DELETE FROM messages WHERE id = (SELECT id FROM messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1)"
    )
    .run(conversationId)
}
