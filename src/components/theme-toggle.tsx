'use client'

import { useEffect, useState } from 'react'
import { MoonStar, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Read initial theme from localStorage or system preference
    if (typeof window === 'undefined') return

    const stored = window.localStorage.getItem('theme') as Theme | null
    const systemPrefersDark = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches

    const initial: Theme = stored ?? (systemPrefersDark ? 'dark' : 'light')
    applyTheme(initial)
    setTheme(initial)
  }, [])

  const applyTheme = (value: Theme) => {
    const root = document.documentElement
    if (value === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    window.localStorage.setItem('theme', value)
  }

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className="rounded-full border border-border/60 hover:bg-muted"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <MoonStar className="h-4 w-4" />
      )}
    </Button>
  )
}


