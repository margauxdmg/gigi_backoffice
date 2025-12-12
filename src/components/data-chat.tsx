'use client'

import { useState } from 'react'
import { askData } from '@/app/actions/data-chat'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export function DataChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Ask me about your data. For example: "How many partially resolved profiles do we have?" or "What is the status of profile with email margaux@example.com?"',
    },
  ])
  const [pending, setPending] = useState(false)
  const [input, setInput] = useState('')

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const question = input.trim()
    if (!question || pending) return

    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setInput('')
    setPending(true)
    try {
      const res = await askData(question)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I couldn't answer this question due to an internal error.",
        },
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Data assistant (beta)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-56 overflow-y-auto rounded-md border bg-muted/40 p-2 text-xs whitespace-pre-wrap">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={m.role === 'user' ? 'text-right mb-2' : 'text-left mb-2'}
            >
              <div
                className={
                  'inline-block rounded-lg px-2 py-1 ' +
                  (m.role === 'user'
                    ? 'bg-blue-50 text-blue-900'
                    : 'bg-white text-slate-900 border')
                }
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            placeholder='Ask something like: "How many partially resolved profiles?"'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={pending}
          />
          <Button type="submit" disabled={pending}>
            {pending ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}


