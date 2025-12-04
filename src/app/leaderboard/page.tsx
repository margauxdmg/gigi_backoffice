'use client'

import { useState, useEffect } from 'react'
import { getLeaderboard } from '@/app/actions/leaderboard'
import { LeaderboardEntry } from '@/types/leaderboard'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Star, TrendingUp, Activity } from "lucide-react"

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const data = await getLeaderboard()
    setEntries(data)
    setLoading(false)
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-4 py-8">
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
          Ops Hall of Fame 🏆
        </h1>
        <p className="text-xl text-muted-foreground">The heroes keeping our data clean and pristine.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {entries.slice(0, 3).map((entry, index) => (
          <Card key={entry.name} className={`relative overflow-hidden border-2 ${index === 0 ? 'border-yellow-400 shadow-yellow-200 shadow-lg scale-105 z-10' : index === 1 ? 'border-gray-300' : 'border-orange-300'} transition-all hover:-translate-y-1`}>
            <div className={`absolute top-0 left-0 w-full h-2 ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-300' : 'bg-orange-300'}`} />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 relative">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarFallback className={`text-3xl font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-600'}`}>
                    {entry.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 shadow-sm border">
                  {index === 0 && <Trophy className="h-8 w-8 text-yellow-400 fill-yellow-400" />}
                  {index === 1 && <Medal className="h-8 w-8 text-gray-400 fill-gray-400" />}
                  {index === 2 && <Medal className="h-8 w-8 text-orange-400 fill-orange-400" />}
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">{entry.name}</CardTitle>
              <Badge variant="secondary" className="mt-2">
                {index === 0 ? 'Ops Champion' : index === 1 ? 'Data Warrior' : 'Rising Star'}
              </Badge>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl font-black tracking-tighter mb-1">{entry.actions}</div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Fixes</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            The Rest of the Squad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entries.slice(3).map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">#{index + 4}</span>
                  <Avatar>
                    <AvatarFallback>{entry.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-lg">{entry.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xl font-bold">{entry.actions}</div>
                    <div className="text-xs text-muted-foreground">fixes</div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
            ))}
            {entries.length <= 3 && (
              <div className="text-center py-8 text-muted-foreground italic">
                Waiting for more challengers to join the arena...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

