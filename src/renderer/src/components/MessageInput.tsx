import { useRef, useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { ImagePlus, Send, Square, X } from 'lucide-react'

interface MessageInputProps {
  streaming: boolean
  onSend: (text: string, images?: string[]) => void
  onStop: () => void
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function MessageInput({ streaming, onSend, onStop }: MessageInputProps): React.JSX.Element {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = (): void => {
    const value = text.trim()
    if ((!value && images.length === 0) || streaming) return
    onSend(value, images.length > 0 ? images : undefined)
    setText('')
    setImages([])
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!streaming) submit()
    }
  }

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>): Promise<void> => {
    const items = e.clipboardData?.items
    if (!items) return
    const urls: string[] = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) urls.push(await fileToDataUrl(file))
      }
    }
    if (urls.length > 0) {
      e.preventDefault()
      setImages((prev) => [...prev, ...urls])
    }
  }

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? [])
    const urls = await Promise.all(files.map(fileToDataUrl))
    setImages((prev) => [...prev, ...urls])
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="group relative">
              <img
                src={url}
                alt="待发送图片"
                className="h-16 w-16 rounded-md border object-cover"
              />
              <button
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5 text-muted-foreground hover:text-destructive"
                aria-label="移除图片"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFiles}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileRef.current?.click()}
          aria-label="添加图片"
          disabled={streaming}
        >
          <ImagePlus className="size-4" />
        </Button>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="输入消息…（Enter 发送，Shift+Enter 换行，可粘贴图片）"
          rows={1}
          className="min-h-12 flex-1 resize-none"
        />
        {streaming ? (
          <Button onClick={onStop} variant="outline" size="icon" aria-label="停止生成">
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            size="icon"
            disabled={!text.trim() && images.length === 0}
            aria-label="发送"
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
