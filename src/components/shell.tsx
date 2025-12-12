'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/actions/auth'
import { UserIdentityModal } from '@/components/user-identity-modal'
import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/theme-toggle'

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const updateIdentity = () => {
      const stored = localStorage.getItem('admin_user')
      setUserName(stored)
    }
    
    updateIdentity()
    window.addEventListener('user-identity-changed', updateIdentity)
    return () => window.removeEventListener('user-identity-changed', updateIdentity)
  }, [])

  const isActive = (path: string) => pathname === path ? 'text-primary font-bold' : 'text-muted-foreground hover:text-primary'

  return (
    <div className="min-h-screen bg-background">
      <UserIdentityModal />
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center px-8 py-4 gap-10">
          <div className="flex items-center gap-2">
            <Image
              src="/gigi-logo.svg"
              alt="Gigi logo"
              width={28}
              height={28}
              priority
            />
            <h1 className="text-xl font-black tracking-tight">Gigi</h1>
          </div>
          <nav className="flex items-center gap-8 text-base font-medium">
            <Link href="/dashboard/nyne" className={isActive('/dashboard/nyne')}>
              Dashboard Nyne
            </Link>
            <Link href="/dashboard/ops" className={isActive('/dashboard/ops')}>
              Dashboard Ops
            </Link>
            <Link href="/dashboard/batches" className={isActive('/dashboard/batches')}>
              Batches
            </Link>
            <Link
              href="/dashboard/persona"
              className={isActive('/dashboard/persona')}
            >
              Our ICP
            </Link>
            <Link href="/leaderboard" className={isActive('/leaderboard')}>
              Leaderboard
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            {userName && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                  <AvatarFallback>{userName[0]}</AvatarFallback>
                </Avatar>
                <span>{userName}</span>
              </div>
            )}
            <form action={logout}>
              <Button variant="outline" size="sm">Logout</Button>
            </form>
          </div>
        </div>
      </header>
      <main className="p-8 max-w-[1600px] mx-auto">
        {children}
      </main>
    </div>
  )
}
