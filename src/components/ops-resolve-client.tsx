'use client'

import { useMemo, useState } from 'react'
import { NyneProfile } from '@/types/nyne'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { updateTriageProfile } from '@/app/actions/triage'
import { logAdminAction } from '@/app/actions/leaderboard'

type User = {
  user_id: string
  email: string
  full_name: string
  title: string
  profile_pic: string | null
  created_at: string
}

type Props = {
  user: User
  profiles: NyneProfile[]
}

// Remove unicode escape sequences like \ud83c\udf0e from scraped texts
function cleanText(value?: string | null) {
  if (!value) return ''
  try {
    return value.replace(/\\u[0-9a-fA-F]{4}/g, '')
  } catch {
    return value || ''
  }
}
function isMissingCity(city: string | null) {
  if (!city) return true
  const v = city.trim().toLowerCase()
  return !v || v === 'not specified' || v === 'not_specified' || v === 'n/a'
}

function isPartiallyResolved(p: NyneProfile) {
  // Partially_resolved: Has LinkedIn but missing some fields
  if (!p.linkedin_url) return false
  const missingRequired =
    !p.profile_pic ||
    !p.firstname ||
    !p.lastname ||
    isMissingCity(p.city) ||
    !p.job_title ||
    !p.company ||
    !p.bio ||
    !p.schools_attended ||
    !p.organizations ||
    !p.social_profiles
  return !!missingRequired
}

function isFullyResolved(p: NyneProfile) {
  // Fully_resolved: Has LinkedIn and all fields
  if (!p.linkedin_url) return false
  return (
    !!p.profile_pic &&
    !!p.firstname &&
    !!p.lastname &&
    !isMissingCity(p.city) &&
    !!p.job_title &&
    !!p.company &&
    !!p.bio &&
    !!p.schools_attended &&
    !!p.organizations &&
    !!p.social_profiles
  )
}

// Any profile that isn't Partial or Full is considered Failed/Not Resolved
// (typically meaning no LinkedIn URL, or explicit failed status)

export function OpsResolveClient({ user, profiles }: Props) {
  const orderedProfiles = useMemo(() => {
    const partial: NyneProfile[] = []
    const full: NyneProfile[] = []
    const failed: NyneProfile[] = []

    profiles.forEach((p) => {
      if (isPartiallyResolved(p)) {
        partial.push(p)
      } else if (isFullyResolved(p)) {
        full.push(p)
      } else {
        failed.push(p)
      }
    })

    // Prioritize: Partial -> Full -> Failed
    return [...partial, ...full, ...failed]
  }, [profiles])

  const [index, setIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  const current = orderedProfiles[index]

  const [profilePic, setProfilePic] = useState(current?.profile_pic || '')
  const [lastname, setLastname] = useState(cleanText(current?.lastname))
  const [city, setCity] = useState(cleanText(current?.city))
  const [linkedin, setLinkedin] = useState(current?.linkedin_url || '')
  const [bio, setBio] = useState(cleanText(current?.bio))

  if (!current) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard Ops – {user.full_name}</h2>
          <Link href="/dashboard/ops">
            <Button variant="outline">Back to Dashboard Ops</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No profiles to resolve in this network.
          </CardContent>
        </Card>
      </div>
    )
  }

  const category: 'partial' | 'full' | 'failed' = isPartiallyResolved(current)
    ? 'partial'
    : isFullyResolved(current)
    ? 'full'
    : 'failed'

  const totalPartial = orderedProfiles.filter(isPartiallyResolved).length
  const totalFull = orderedProfiles.filter(isFullyResolved).length
  const totalFailed = orderedProfiles.filter(
    (p) => !isPartiallyResolved(p) && !isFullyResolved(p)
  ).length

  const resetForNext = (nextIndex: number) => {
    setIndex(nextIndex)
    const next = orderedProfiles[nextIndex]
    if (next) {
      setProfilePic(next.profile_pic || '')
      setLastname(cleanText(next.lastname))
      setCity(cleanText(next.city))
      setLinkedin(next.linkedin_url || '')
      setBio(cleanText(next.bio))
    }
  }

  const handleSkip = async () => {
    const nextIndex = index + 1
    resetForNext(nextIndex)
  }

  const handleSave = async () => {
    if (!current) return
    setSaving(true)
    try {
      const updates: Partial<NyneProfile> = {}

      // Partial + Full: update core fields if changed
      if (category === 'partial' || category === 'full') {
        const cleanLast = cleanText(lastname)
        const cleanCity = cleanText(city)
        const cleanLinkedin = linkedin
        const cleanBio = cleanText(bio)

        if (profilePic && profilePic !== (current.profile_pic || '')) {
          updates.profile_pic = profilePic
        }
        if (cleanLast !== (current.lastname || '')) updates.lastname = cleanLast || null
        if (cleanCity !== (current.city || '')) updates.city = cleanCity || null
        if (cleanLinkedin !== (current.linkedin_url || ''))
          updates.linkedin_url = cleanLinkedin || null
        if (cleanBio !== (current.bio || '')) updates.bio = cleanBio || null
      }

      // Failed: status + linkedin
      if (category === 'failed') {
        const cleanLinkedin = linkedin
        if (cleanLinkedin !== (current.linkedin_url || ''))
          updates.linkedin_url = cleanLinkedin || null
        updates.status = 'not_resolved_yet' as any
      }

      if (Object.keys(updates).length > 0) {
        await updateTriageProfile(current.email, updates)
      }

      // Log action
      const userName = localStorage.getItem('admin_user') || 'Anonymous'
      let actionType = 'ops_validate'
      if (category === 'partial') actionType = 'ops_partial_fix'
      else if (category === 'failed') actionType = 'ops_trigger_launched'

      await logAdminAction(
        userName,
        actionType,
        current.profile_id,
        `Ops resolved profile in category ${category}`
      )

      // Next profile
      const nextIndex = index + 1
      resetForNext(nextIndex)
    } catch (e) {
      console.error('Failed to save ops resolution', e)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={user.profile_pic || ''} />
            <AvatarFallback>{user.full_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-bold">{user.full_name}</div>
            <div className="text-xs text-muted-foreground">{user.title}</div>
            <div className="text-xs text-muted-foreground">
              <span>Network size: </span>
              <span>{profiles.length}</span>
            </div>
          </div>
        </div>
        <Link href="/dashboard/ops">
          <Button variant="outline">Quit resolving</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">User selected</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>start_onboarding:</span>
                <span>
                  {user.created_at
                    ? formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>
            <div className="flex gap-6 text-xs">
              <div className="text-center">
                <div>partially_resolved_missing_required_fields</div>
                <div className="font-semibold text-yellow-700">{totalPartial}</div>
              </div>
              <div className="text-center">
                <div>fully_resolved_to_check</div>
                <div className="font-semibold text-green-700">{totalFull}</div>
              </div>
              <div className="text-center">
                <div>not_resolved_profile</div>
                <div className="font-semibold text-red-600">{totalFailed}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-8 flex justify-center">
          <div className="w-full max-w-xl rounded-3xl border bg-yellow-50 px-8 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-orange-600">
                {category === 'partial'
                  ? 'Partially_resolved'
                  : category === 'failed'
                  ? 'Not_resolved_profile'
                  : 'Fully_resolved'}
              </div>
              <div className="text-xs text-muted-foreground">{current.email}</div>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border bg-white">
                <AvatarImage src={current.profile_pic || ''} />
                <AvatarFallback>
                  {cleanText(current.firstname)?.[0] ||
                    cleanText(current.lastname)?.[0] ||
                    '?'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="text-lg font-bold">
                  {cleanText(current.firstname) || 'Unknown'}{' '}
                  {cleanText(current.lastname)}
                </div>
                {current.linkedin_url && (
                  <a
                    href={current.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    View LinkedIn profile
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              {(category === 'partial' || category === 'full') && (
                <>
                  {!current.profile_pic && (
                    <div className="space-y-1">
                      <Label htmlFor="profilePic">Profile picture URL</Label>
                      <Input
                        id="profilePic"
                        value={profilePic}
                        onChange={(e) => setProfilePic(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="lastname">Last name</Label>
                      <Input
                        id="lastname"
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input
                      id="linkedin"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {category === 'failed' && (
                <div className="space-y-1">
                  <Label htmlFor="linkedin_failed">New LinkedIn URL</Label>
                  <Input
                    id="linkedin_failed"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSkip}
                disabled={saving}
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {category === 'partial'
                  ? 'Save & next'
                  : category === 'failed'
                  ? 'Save & launch trigger'
                  : 'Those infos are true'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


