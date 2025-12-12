'use client'

import { useState, useEffect } from 'react'
import { getTriageStats, getNextTriageProfile, updateTriageProfile, TriageStats } from '@/app/actions/triage'
import { logAdminAction } from '@/app/actions/leaderboard'
import { NyneProfile } from '@/types/nyne'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, MapPin, User, Image as ImageIcon, ArrowRight, SkipForward, Save, Linkedin, FileText, Trophy, Zap, Star, Flame, X, Check } from "lucide-react"
import confetti from 'canvas-confetti'

export function TriageSection() {
  const [stats, setStats] = useState<TriageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeMode, setActiveMode] = useState<'profile_pic' | 'lastname' | 'city' | 'linkedin_url' | 'bio' | null>(null)
  const [currentProfile, setCurrentProfile] = useState<NyneProfile | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [streak, setStreak] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const data = await getTriageStats()
    setStats(data)
    setLoading(false)
  }

  const startTriage = async (mode: 'profile_pic' | 'lastname' | 'city' | 'linkedin_url' | 'bio') => {
    setActiveMode(mode)
    setLoading(true)
    const profile = await getNextTriageProfile(mode)
    setCurrentProfile(profile)
    setInputValue('')
    setLoading(false)
    setStreak(0)
    setSessionCount(0)
  }

  const handleSkip = async () => {
    if (!activeMode) return
    setLoading(true)
    setStreak(0)
    
    const next = await getNextTriageProfile(activeMode)
    if (next && next.email !== currentProfile?.email) {
        setCurrentProfile(next)
        setInputValue('')
        setLoading(false)
    } else {
        setCurrentProfile(next) 
        setInputValue('')
        setLoading(false)
    }
  }
  
  const handleSave = async () => {
    if (!currentProfile || !activeMode) return
    setSaving(true)
    
    try {
      const updates: Partial<NyneProfile> = {}
      updates[activeMode] = inputValue
      
      await updateTriageProfile(currentProfile.email, updates)
      
      // Log action for leaderboard & ops dashboard
      const userName = localStorage.getItem('admin_user') || 'Anonymous'
      // Fire and forget log action to not block UI
      logAdminAction(userName, 'triage_fix', currentProfile.profile_id, `Fixed missing ${activeMode}`)
      
      setStreak(s => s + 1)
      setSessionCount(c => c + 1)
      
      if ((streak + 1) % 5 === 0) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          })
      }

      const next = await getNextTriageProfile(activeMode)
      if (next) {
        setCurrentProfile(next)
        setInputValue('')
      } else {
        setCurrentProfile(null)
        setActiveMode(null)
        loadStats()
        confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.5 }
        })
      }
    } catch (error) {
      console.error("Failed to save", error)
      alert("Failed to save changes")
    } finally {
      setSaving(false)
      loadStats()
    }
  }

  if (loading && !stats && !activeMode) return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
          <div className="h-12 w-12 rounded-full bg-muted"></div>
          <div className="h-4 w-48 bg-muted rounded"></div>
      </div>
  )

  // Triage Mode UI
  if (activeMode && currentProfile) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
        <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveMode(null)} className="hover:bg-transparent pl-0">
                    ← Back
                </Button>
                <h3 className="text-xl font-bold flex items-center gap-2">
                    {activeMode === 'profile_pic' && <ImageIcon className="h-5 w-5 text-blue-500"/>}
                    {activeMode === 'lastname' && <User className="h-5 w-5 text-orange-500"/>}
                    {activeMode === 'city' && <MapPin className="h-5 w-5 text-green-500"/>}
                    {activeMode === 'linkedin_url' && <Linkedin className="h-5 w-5 text-blue-700"/>}
                    {activeMode === 'bio' && <FileText className="h-5 w-5 text-purple-500"/>}
                    Fixing {
                      activeMode === 'profile_pic' ? 'Missing Pics' : 
                      activeMode === 'lastname' ? 'Missing Names' : 
                      activeMode === 'linkedin_url' ? 'Missing LinkedIn' :
                      activeMode === 'bio' ? 'Missing Bios' :
                      'Missing Cities'
                    }
                </h3>
            </div>
            
            <div className="flex items-center gap-6">
                {streak > 1 && (
                    <div className="flex items-center gap-1 text-orange-500 font-bold animate-bounce">
                        <Flame className="h-5 w-5 fill-orange-500" />
                        {streak} Streak!
                    </div>
                )}
                <div className="flex items-center gap-1 text-muted-foreground font-medium">
                    <Trophy className="h-4 w-4" />
                    {sessionCount} Fixed
                </div>
            </div>
        </div>

        <Card className="border-2 border-primary/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            
            <CardHeader className="bg-muted/30 pb-8">
                <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-bold text-primary shrink-0 overflow-hidden">
                            {currentProfile.profile_pic ? (
                                <img src={currentProfile.profile_pic} alt="" className="h-full w-full object-cover" />
                            ) : (
                                currentProfile.firstname?.[0] || '?'
                            )}
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-3xl font-black tracking-tight">
                                {currentProfile.firstname || 'Unknown Name'} {currentProfile.lastname || ''}
                            </CardTitle>
                            <div className="flex flex-wrap gap-2">
                                {currentProfile.linkedin_url && (
                                    <a href={currentProfile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 bg-[#0077b5] text-white rounded-full hover:bg-[#0077b5]/90 transition-colors font-bold text-sm shadow-sm">
                                        <Linkedin className="h-3.5 w-3.5 fill-white"/>
                                        LinkedIn
                                    </a>
                                )}
                                {currentProfile.email && (
                                    <Badge variant="secondary" className="font-mono text-xs">
                                        {currentProfile.email}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="-mt-4 space-y-6">
                <div className="space-y-6 pt-6">
                    <Label htmlFor="triage-input" className="text-2xl font-bold flex items-center gap-3">
                        {activeMode === 'profile_pic' && <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ImageIcon className="h-6 w-6"/></div>}
                        {activeMode === 'lastname' && <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><User className="h-6 w-6"/></div>}
                        {activeMode === 'city' && <div className="p-2 bg-green-100 text-green-600 rounded-lg"><MapPin className="h-6 w-6"/></div>}
                        {activeMode === 'linkedin_url' && <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Linkedin className="h-6 w-6"/></div>}
                        {activeMode === 'bio' && <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><FileText className="h-6 w-6"/></div>}
                        
                        <span>
                            Enter {
                              activeMode === 'profile_pic' ? 'Image URL' : 
                              activeMode === 'lastname' ? 'Last Name' : 
                              activeMode === 'linkedin_url' ? 'LinkedIn URL' :
                              activeMode === 'bio' ? 'Bio' :
                              'City'
                            }
                        </span>
                    </Label>
                    
                    <div className="relative group">
                        {activeMode === 'bio' ? (
                             <textarea 
                                id="triage-input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Paste the bio here..."
                                className="flex min-h-[120px] w-full rounded-xl border-2 border-muted bg-background px-4 py-3 text-lg ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-0 transition-colors shadow-sm"
                                autoFocus
                                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && handleSave()}
                             />
                        ) : (
                            <Input 
                                id="triage-input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={
                                  activeMode === 'profile_pic' ? 'https://...' : 
                                  activeMode === 'lastname' ? 'Doe' : 
                                  activeMode === 'linkedin_url' ? 'https://linkedin.com/in/...' :
                                  'New York, NY'
                                }
                                className="h-14 text-lg rounded-xl border-2 border-muted focus-visible:border-primary focus-visible:ring-0 shadow-sm pl-4"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                        )}
                    </div>
                    
                    {/* Dating App Style Actions */}
                    <div className="flex items-center justify-between gap-4 pt-4">
                        <Button 
                            variant="outline" 
                            onClick={handleSkip} 
                            disabled={saving} 
                            className="flex-1 h-14 rounded-full border-2 border-red-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all group text-lg font-medium"
                        >
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mr-2 group-hover:bg-red-200 transition-colors">
                                <X className="h-5 w-5 text-red-500 group-hover:text-red-600" />
                            </div>
                            Skip
                        </Button>

                        <Button 
                            onClick={handleSave} 
                            disabled={saving || !inputValue.trim()} 
                            className="flex-1 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105 text-lg font-bold shadow-lg shadow-green-200 group"
                        >
                            Save & Next
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center ml-2">
                                <Check className="h-5 w-5" />
                            </div>
                        </Button>
                    </div>
                    <div className="text-center">
                        <span className="text-xs text-muted-foreground">or press <strong>Enter</strong> to save</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    )
  }

  // ... (rest of component including TriageCard)
  if (activeMode && !currentProfile && !loading) {
      return (
          <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in zoom-in-50 duration-500">
              <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                <Trophy className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                  <h3 className="text-3xl font-bold">Mission Complete!</h3>
                  <p className="text-muted-foreground text-lg">You've fixed all missing {activeMode} fields.</p>
                  <div className="pt-4 flex justify-center gap-2">
                      <Badge variant="secondary" className="text-lg px-4 py-1">
                          Total Fixed: {sessionCount}
                      </Badge>
                  </div>
              </div>
              <Button onClick={() => setActiveMode(null)} size="lg" className="mt-8">Back to Headquarters</Button>
          </div>
      )
  }

  // Dashboard Mode
  const total = stats?.totalProfiles || 1
  const missingPic = stats?.missingPic || 0
  const missingLastname = stats?.missingLastname || 0
  const missingCity = stats?.missingCity || 0
  const missingLinkedin = stats?.missingLinkedin || 0
  const missingBio = stats?.missingBio || 0
  
  const totalMissing = missingPic + missingLastname + missingCity + missingLinkedin + missingBio
  const totalFields = total * 5 // 5 tracked fields
  const simpleHealthScore = totalFields > 0 ? Math.round(((totalFields - totalMissing) / totalFields) * 100) : 100
  
  // Determine rank
  let rank = 'Data Rookie'
  let rankColor = 'text-gray-500'
  if (simpleHealthScore > 50) { rank = 'Data Guardian'; rankColor = 'text-blue-500'; }
  if (simpleHealthScore > 80) { rank = 'Data Master'; rankColor = 'text-purple-500'; }
  if (simpleHealthScore > 95) { rank = 'Data Legend'; rankColor = 'text-amber-500'; }

  return (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    Data Health Center <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                </h2>
                <p className="text-muted-foreground">Improve your database quality to unlock better insights.</p>
            </div>
            
            <div className="flex items-center gap-6 bg-muted/50 p-3 rounded-lg">
                <div className="text-right">
                    <div className="text-sm font-medium text-muted-foreground">Current Rank</div>
                    <div className={`text-xl font-bold ${rankColor}`}>{rank}</div>
                </div>
                <div className="h-10 w-px bg-border"></div>
                <div className="text-right">
                    <div className="text-sm font-medium text-muted-foreground">Health Score</div>
                    <div className="text-3xl font-black">{simpleHealthScore}%</div>
                </div>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TriageCard 
                title="Missing Pics" 
                count={missingPic} 
                icon={<ImageIcon className="h-6 w-6"/>}
                color="text-blue-500"
                bgColor="bg-blue-500/10"
                onClick={() => startTriage('profile_pic')}
                total={total}
            />
            <TriageCard 
                title="Missing Last Names" 
                count={missingLastname} 
                icon={<User className="h-6 w-6"/>}
                color="text-orange-500"
                bgColor="bg-orange-500/10"
                onClick={() => startTriage('lastname')}
                total={total}
            />
            <TriageCard 
                title="Missing Cities" 
                count={missingCity} 
                icon={<MapPin className="h-6 w-6"/>}
                color="text-green-500"
                bgColor="bg-green-500/10"
                onClick={() => startTriage('city')}
                total={total}
            />
            <TriageCard 
                title="Missing LinkedIn" 
                count={missingLinkedin} 
                icon={<Linkedin className="h-6 w-6"/>}
                color="text-indigo-500"
                bgColor="bg-indigo-500/10"
                onClick={() => startTriage('linkedin_url')}
                total={total}
            />
            <TriageCard 
                title="Missing Bio" 
                count={missingBio} 
                icon={<FileText className="h-6 w-6"/>}
                color="text-purple-500"
                bgColor="bg-purple-500/10"
                onClick={() => startTriage('bio')}
                total={total}
            />
        </div>
    </div>
  )
}

function TriageCard({ title, count, icon, onClick, total, color, bgColor }: { title: string, count: number, icon: React.ReactNode, onClick: () => void, total: number, color: string, bgColor: string }) {
    const percent = Math.round((count / total) * 100)
    const isClean = count === 0

    return (
        <Card 
            className={`group relative overflow-hidden cursor-pointer border-0 bg-gradient-to-b from-[#faf5ff] via-white to-[#fdf2ff] dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${isClean ? 'opacity-70' : ''}`} 
            onClick={isClean ? undefined : onClick}
        >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-70" />
            <CardContent className="pt-5 pb-6 px-5 flex flex-col gap-4 min-h-[190px]">
                <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-2xl ${bgColor} ${color} shadow-sm`}>
                        {icon}
                    </div>
                    {isClean && (
                      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px] uppercase">
                        Clean
                      </Badge>
                    )}
                </div>
                
                <div className="space-y-1">
                    <div className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                        {title}
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black leading-none tracking-tight">{count}</span>
                        <span className="text-xs text-muted-foreground font-medium">profiles</span>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-1">
                    <div className="space-y-1">
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${color.replace('text', 'bg')}`}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                        </div>
                        <span className="text-[11px] text-muted-foreground">{percent}% of DB</span>
                    </div>
                    {!isClean && (
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${color} group-hover:gap-1.5 transition-all`}
                      >
                        Fix now
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                      </button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
