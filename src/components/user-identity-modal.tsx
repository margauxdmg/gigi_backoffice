"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import confetti from 'canvas-confetti'

const USERS = [
  { name: 'Margaux', avatar: 'M', color: 'bg-pink-100 text-pink-600' },
  { name: 'Flora', avatar: 'F', color: 'bg-purple-100 text-purple-600' },
  { name: 'Clara', avatar: 'C', color: 'bg-blue-100 text-blue-600' },
  { name: 'Kevin', avatar: 'K', color: 'bg-green-100 text-green-600' },
  { name: 'Valentin', avatar: 'V', color: 'bg-orange-100 text-orange-600' },
]

export function UserIdentityModal() {
  const [open, setOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('admin_user')
    if (!storedUser) {
      setOpen(true)
    }
  }, [])

  const handleSelectUser = (name: string) => {
    localStorage.setItem('admin_user', name)
    setOpen(false)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
    // Trigger a custom event so other components can know user updated
    window.dispatchEvent(new Event('user-identity-changed'))
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customName.trim()) {
      handleSelectUser(customName.trim())
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (val) setOpen(true) }}> 
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Who are you? 🕵️‍♀️</DialogTitle>
          <DialogDescription className="text-center">
            Identify yourself to climb the Ops Leaderboard!
          </DialogDescription>
        </DialogHeader>
        
        {!showCustom ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            {USERS.map((user) => (
              <Button
                key={user.name}
                variant="outline"
                className="h-20 flex flex-col gap-2 hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => handleSelectUser(user.name)}
              >
                <Avatar className={`h-8 w-8 ${user.color}`}>
                  <AvatarFallback>{user.avatar}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{user.name}</span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="h-20 flex flex-col gap-2 border-dashed border-2"
              onClick={() => setShowCustom(true)}
            >
              <span className="text-2xl">🥹</span>
              <span className="text-xs text-muted-foreground">My name is not here</span>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">What's your name?</Label>
              <Input
                id="name"
                placeholder="Enter your name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCustom(false)}>Back</Button>
              <Button type="submit" className="flex-1" disabled={!customName.trim()}>Let me in! 🚀</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

