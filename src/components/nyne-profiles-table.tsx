'use client'

import { useMemo, useState } from 'react'
import { NyneProfile } from '@/types/nyne'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

type NyneProfileWithOwner = NyneProfile & {
  owner_name?: string | null
  owner_title?: string | null
}

type Props = {
  profiles: NyneProfileWithOwner[]
}

type StatusCategory = 'fully' | 'partially' | 'failed' | 'other'

function isMissingText(value: string | null | undefined) {
  if (!value) return true
  const v = value.trim().toLowerCase()
  return !v || v === 'not specified' || v === 'not_specified' || v === 'n/a' || v === 'na'
}

function isMissingCity(city: string | null) {
  return isMissingText(city)
}

function hasLinkedin(p: NyneProfile) {
  return !isMissingText(p.linkedin_url)
}

function hasProfilePic(p: NyneProfile) {
  return !!p.profile_pic
}

function hasJobTitle(p: NyneProfile) {
  return !isMissingText(p.job_title)
}

function hasCompany(p: NyneProfile) {
  return !isMissingText(p.company)
}

function hasBio(p: NyneProfile) {
  return !isMissingText(p.bio)
}

function hasSchools(p: NyneProfile) {
  const s = p.schools_attended as any
  if (!s) return false
  if (Array.isArray(s)) return s.length > 0
  if (typeof s === 'string') return !isMissingText(s)
  if (typeof s === 'object') return Object.keys(s).length > 0
  return false
}

function hasExperiences(p: NyneProfile) {
  const o = p.organizations as any
  if (!o) return false
  if (Array.isArray(o)) return o.length > 0
  if (typeof o === 'string') return !isMissingText(o)
  if (typeof o === 'object') return Object.keys(o).length > 0
  return false
}

function hasSocialProfiles(p: NyneProfile) {
  return p.social_profiles != null
}

function isFullyResolved(p: NyneProfile) {
  if (!hasLinkedin(p)) return false
  return (
    hasProfilePic(p) &&
    !isMissingText(p.firstname) &&
    !isMissingText(p.lastname) &&
    !isMissingCity(p.city) &&
    hasJobTitle(p) &&
    hasCompany(p) &&
    hasBio(p) &&
    hasSchools(p) &&
    hasExperiences(p) &&
    hasSocialProfiles(p)
  )
}

function isPartiallyResolved(p: NyneProfile) {
  return hasLinkedin(p) && !isFullyResolved(p)
}

function isFailed(p: NyneProfile) {
  return !hasLinkedin(p)
}

function getStatusCategory(p: NyneProfile): StatusCategory {
  if (isPartiallyResolved(p)) return 'partially'
  if (isFullyResolved(p)) return 'fully'
  if (isFailed(p)) return 'failed'
  return 'other'
}

function renderStatus(p: NyneProfile) {
  if (isPartiallyResolved(p)) {
    return <Badge className="bg-amber-50 text-amber-700 border-0">Partially</Badge>
  }
  if (isFullyResolved(p)) {
    return <Badge className="bg-emerald-50 text-emerald-700 border-0">Fully</Badge>
  }
  if (isFailed(p)) {
    return <Badge className="bg-red-50 text-red-700 border-0">Failed</Badge>
  }
  const value = p.status ? String(p.status) : '—'
  return <Badge variant="outline">{value}</Badge>
}

function formatSocialProfiles(value: any): string {
  const socials = typeof value === 'string' ? safeParse(value) : value
  const parts: string[] = []
  if (Array.isArray(socials)) {
    socials.forEach((s: any) => {
      if (typeof s === 'string') {
        parts.push(s)
      } else if (s && typeof s === 'object') {
        if (typeof s.url === 'string') parts.push(s.url)
        if (typeof s.handle === 'string') parts.push(s.handle)
        if (typeof s.username === 'string') parts.push(s.username)
        if (typeof s.profile === 'string') parts.push(s.profile)
      }
    })
  } else if (socials && typeof socials === 'object') {
    Object.values(socials as any).forEach((v: any) => {
      if (v && typeof v === 'object') {
        if (typeof v.url === 'string') parts.push(v.url)
        if (typeof v.handle === 'string') parts.push(v.handle)
        if (typeof v.username === 'string') parts.push(v.username)
      } else if (typeof v === 'string') {
        parts.push(v)
      }
    })
  }
  return parts.filter((x) => x && String(x).trim()).join(', ')
}

function formatOrganizations(value: any): string {
  const orgs = typeof value === 'string' ? safeParse(value) : value
  const parts: string[] = []
  if (Array.isArray(orgs)) {
    orgs.forEach((o: any) => {
      if (typeof o === 'string') {
        parts.push(o)
      } else if (o && typeof o === 'object') {
        if (typeof o.name === 'string') parts.push(o.name)
        if (typeof o.title === 'string') parts.push(o.title)
      }
    })
  } else if (orgs && typeof orgs === 'object') {
    Object.values(orgs as any).forEach((v: any) => {
      if (typeof v === 'string') {
        parts.push(v)
      } else if (v && typeof v === 'object') {
        if (typeof v.name === 'string') parts.push(v.name)
        if (typeof v.title === 'string') parts.push(v.title)
      }
    })
  }
  return parts.filter((x) => x && String(x).trim()).join(', ')
}

function safeParse(value: string | null): any {
  if (!value || typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

type CreatedFilter = 'all' | '1d' | '7d' | '30d' | 'older'

export function NyneProfilesTable({ profiles }: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | StatusCategory>('all')

  // Per-column presence filters: 'all' | 'missing' | 'present'
  const [profilePicFilter, setProfilePicFilter] = useState<'all' | 'missing' | 'present'>(
    'all'
  )
  const [nameFilter, setNameFilter] = useState<'all' | 'missing' | 'present'>('all')
  const [cityFilter, setCityFilter] = useState<'all' | 'missing' | 'present'>('all')
  const [jobFilter, setJobFilter] = useState<'all' | 'missing' | 'present'>('all')
  const [companyFilter, setCompanyFilter] = useState<'all' | 'missing' | 'present'>('all')
  const [schoolsFilter, setSchoolsFilter] = useState<'all' | 'missing' | 'present'>('all')
  const [socialFilter, setSocialFilter] = useState<'all' | 'missing' | 'present'>('all')
  const [orgsFilter, setOrgsFilter] = useState<'all' | 'missing' | 'present'>('all')
  const [createdFilter, setCreatedFilter] = useState<CreatedFilter>('all')

  const [procSort, setProcSort] = useState<'none' | 'asc' | 'desc'>('none')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return profiles.filter((p) => {
      const category = getStatusCategory(p)
      if (statusFilter !== 'all' && statusFilter !== category) {
        return false
      }

      if (q) {
        const pieces: string[] = []
        if (p.email) pieces.push(p.email)
        if (p.firstname) pieces.push(p.firstname)
        if (p.lastname) pieces.push(p.lastname)
        if (p.city) pieces.push(p.city)
        if (p.headline) pieces.push(p.headline)
        if (p.bio) pieces.push(p.bio)
        if (p.linkedin_url) pieces.push(p.linkedin_url)
        if (p.owner_name) pieces.push(p.owner_name)
        if (p.owner_title) pieces.push(p.owner_title)
        const schools =
          typeof p.schools_attended === 'string'
            ? safeParse(p.schools_attended)
            : p.schools_attended
        if (Array.isArray(schools)) {
          schools.forEach((s: any) => {
            if (typeof s === 'string') pieces.push(s)
            else if (s && typeof s.name === 'string') pieces.push(s.name)
          })
        }

        const socialsText = formatSocialProfiles(p.social_profiles)
        if (socialsText) pieces.push(socialsText)

        const orgsText = formatOrganizations(p.organizations)
        if (orgsText) pieces.push(orgsText)

        const text = pieces.join(' ').toLowerCase()
        if (!text.includes(q)) return false
      }

      // Per-column presence filters
      const profileHasPic = hasProfilePic(p)
      if (profilePicFilter === 'missing' && profileHasPic) return false
      if (profilePicFilter === 'present' && !profileHasPic) return false

      const namePresent = !!(p.firstname || p.lastname)
      if (nameFilter === 'missing' && namePresent) return false
      if (nameFilter === 'present' && !namePresent) return false

      const cityMissing = isMissingCity(p.city)
      if (cityFilter === 'missing' && !cityMissing) return false
      if (cityFilter === 'present' && cityMissing) return false

      const jobPresent = hasJobTitle(p)
      if (jobFilter === 'missing' && jobPresent) return false
      if (jobFilter === 'present' && !jobPresent) return false

      const companyPresent = hasCompany(p)
      if (companyFilter === 'missing' && companyPresent) return false
      if (companyFilter === 'present' && !companyPresent) return false

      const schoolsPresent = hasSchools(p)
      if (schoolsFilter === 'missing' && schoolsPresent) return false
      if (schoolsFilter === 'present' && !schoolsPresent) return false

      const socialPresent = hasSocialProfiles(p)
      if (socialFilter === 'missing' && socialPresent) return false
      if (socialFilter === 'present' && !socialPresent) return false

      const orgsPresent = hasExperiences(p)
      if (orgsFilter === 'missing' && orgsPresent) return false
      if (orgsFilter === 'present' && !orgsPresent) return false

      if (createdFilter !== 'all') {
        if (!p.created_on) return false
        const createdDate = new Date(p.created_on)
        const now = new Date()
        const diffMs = now.getTime() - createdDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (createdFilter === '1d' && diffDays > 1) return false
        if (createdFilter === '7d' && diffDays > 7) return false
        if (createdFilter === '30d' && diffDays > 30) return false
        if (createdFilter === 'older' && diffDays <= 30) return false
      }

      return true
    })
  }, [
    profiles,
    query,
    statusFilter,
    profilePicFilter,
    nameFilter,
    cityFilter,
    jobFilter,
    companyFilter,
    schoolsFilter,
    socialFilter,
    orgsFilter,
    createdFilter,
  ])

  const visibleProfiles = useMemo(() => {
    if (procSort === 'none') return filtered
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      const av = a.processing_seconds ?? (procSort === 'asc' ? Infinity : -1)
      const bv = b.processing_seconds ?? (procSort === 'asc' ? Infinity : -1)
      return procSort === 'asc' ? av - bv : bv - av
    })
    return sorted
  }, [filtered, procSort])

  const handleExport = () => {
    // Align CSV with visible table columns
    const headers = [
      'Profile pic',
      'Email',
      'LinkedIn URL',
      'City',
      'Job title',
      'Company',
      'Schools',
      'Social profiles',
      'Organizations',
      'Status',
      'Owner',
      'Created',
      'Proc. (s)',
      'profile_id',
      'firstname',
      'lastname',
    ]

    const rows = visibleProfiles.map((p) => {
      const statusCategory = getStatusCategory(p)
      const statusLabel =
        statusCategory === 'fully'
          ? 'Fully'
          : statusCategory === 'partially'
          ? 'Partially'
          : statusCategory === 'failed'
          ? 'Failed'
          : p.status ?? '—'

      const schoolsText = (() => {
        const schools =
          typeof p.schools_attended === 'string'
            ? safeParse(p.schools_attended)
            : p.schools_attended
        if (Array.isArray(schools)) {
          return schools
            .map((s: any) =>
              typeof s === 'string' ? s : s?.name ? String(s.name) : JSON.stringify(s)
            )
            .join(' | ')
        }
        return ''
      })()

      const owner =
        p.owner_name && p.owner_title
          ? `${p.owner_name} | ${p.owner_title}`
          : p.owner_name || p.owner_title || ''

      return [
        p.profile_pic ?? '',
        p.email ?? '',
        p.linkedin_url ?? '',
        p.city ?? '',
        p.job_title ?? '',
        p.company ?? '',
        schoolsText,
        formatSocialProfiles(p.social_profiles),
        formatOrganizations(p.organizations),
        statusLabel,
        owner,
        p.created_on ?? '',
        p.processing_seconds != null ? String(p.processing_seconds) : '',
        p.profile_id,
        p.firstname ?? '',
        p.lastname ?? '',
      ]
    })

    const csvContent =
      [headers, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n') + '\n'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'nyne_profiles.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    if ((URL as any).revokeObjectURL) {
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold">All profiles in network</h3>
          <p className="text-xs text-muted-foreground">
            {filtered.length} profiles • filter and export like in Supabase
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name, email, city, LinkedIn, status..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64"
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All statuses</option>
            <option value="fully">Fully</option>
            <option value="partially">Partially</option>
            <option value="failed">Failed</option>
            <option value="other">Other</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[260px]">
                <div className="flex items-center justify-between gap-1">
                  <span>Profile</span>
                  <select
                    className="h-7 rounded-md border border-input bg-background px-1 text-[11px]"
                    value={profilePicFilter}
                    onChange={(e) =>
                      setProfilePicFilter(
                        e.target.value as 'all' | 'missing' | 'present'
                      )
                    }
                  >
                    <option value="all">All</option>
                    <option value="missing">Missing</option>
                    <option value="present">Present</option>
                  </select>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center justify-between gap-1">
                  <span>Email / name</span>
                  <select
                    className="h-7 rounded-md border border-input bg-background px-1 text-[11px]"
                    value={nameFilter}
                    onChange={(e) =>
                      setNameFilter(e.target.value as 'all' | 'missing' | 'present')
                    }
                  >
                    <option value="all">All</option>
                    <option value="missing">Missing</option>
                    <option value="present">Present</option>
                  </select>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center justify-between gap-1">
                  <span>City</span>
                  <select
                    className="h-7 rounded-md border border-input bg-background px-1 text-[11px]"
                    value={cityFilter}
                    onChange={(e) =>
                      setCityFilter(e.target.value as 'all' | 'missing' | 'present')
                    }
                  >
                    <option value="all">All</option>
                    <option value="missing">Missing</option>
                    <option value="present">Present</option>
                  </select>
                </div>
              </TableHead>
              {/* LinkedIn URL column without extra filter (status already filters on it) */}
              <TableHead>LinkedIn URL</TableHead>
              <TableHead>
                <div className="flex items-center justify-between gap-1">
                  <span>Job title</span>
                  <select
                    className="h-7 rounded-md border border-input bg-background px-1 text-[11px]"
                    value={jobFilter}
                    onChange={(e) =>
                      setJobFilter(e.target.value as 'all' | 'missing' | 'present')
                    }
                  >
                    <option value="all">All</option>
                    <option value="missing">Missing</option>
                    <option value="present">Present</option>
                  </select>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center justify-between gap-1">
                  <span>Company</span>
                  <select
                    className="h-7 rounded-md border border-input bg-background px-1 text-[11px]"
                    value={companyFilter}
                    onChange={(e) =>
                      setCompanyFilter(e.target.value as 'all' | 'missing' | 'present')
                    }
                  >
                    <option value="all">All</option>
                    <option value="missing">Missing</option>
                    <option value="present">Present</option>
                  </select>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center justify-between gap-1">
                  <span>Schools</span>
                  <select
                    className="h-7 rounded-md border border-input bg-background px-1 text-[11px]"
                    value={schoolsFilter}
                    onChange={(e) =>
                      setSchoolsFilter(e.target.value as 'all' | 'missing' | 'present')
                    }
                  >
                    <option value="all">All</option>
                    <option value="missing">Missing</option>
                    <option value="present">Present</option>
                  </select>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center justify-between gap-1">
                  <span>Social profiles</span>
                  <select
                    className="h-7 rounded-md border border-input bg-background px-1 text-[11px]"
                    value={socialFilter}
                    onChange={(e) =>
                      setSocialFilter(e.target.value as 'all' | 'missing' | 'present')
                    }
                  >
                    <option value="all">All</option>
                    <option value="missing">Missing</option>
                    <option value="present">Present</option>
                  </select>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center justify-between gap-1">
                  <span>Organizations</span>
                  <select
                    className="h-7 rounded-md border border-input bg-background px-1 text-[11px]"
                    value={orgsFilter}
                    onChange={(e) =>
                      setOrgsFilter(e.target.value as 'all' | 'missing' | 'present')
                    }
                  >
                    <option value="all">All</option>
                    <option value="missing">Missing</option>
                    <option value="present">Present</option>
                  </select>
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>
                <div className="flex items-center justify-between gap-1">
                  <span>Created</span>
                  <select
                    className="h-7 rounded-md border border-input bg-background px-1 text-[11px]"
                    value={createdFilter}
                    onChange={(e) =>
                      setCreatedFilter(e.target.value as CreatedFilter)
                    }
                  >
                    <option value="all">All dates</option>
                    <option value="1d">≤ 1 day</option>
                    <option value="7d">≤ 7 days</option>
                    <option value="30d">≤ 30 days</option>
                    <option value="older">&gt; 30 days</option>
                  </select>
                </div>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  className="flex w-full items-center justify-end gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setProcSort((prev) =>
                      prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none'
                    )
                  }
                >
                  <span>Proc. (s)</span>
                  <span className="text-[10px]">
                    {procSort === 'asc'
                      ? '▲'
                      : procSort === 'desc'
                      ? '▼'
                      : '↕'}
                  </span>
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProfiles.map((p) => (
              <TableRow key={p.profile_id}>
                <TableCell>
                  <div className="flex items-between gap-3">
                    <Avatar className="h-9 w-9 border">
                      <AvatarImage src={p.profile_pic || ''} />
                      <AvatarFallback>
                        {(p.firstname?.[0] || p.lastname?.[0] || '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="font-medium">
                    {p.firstname || p.lastname ? `${p.firstname ?? ''} ${p.lastname ?? ''}` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-width-[220px]">
                    {p.email}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {p.city || <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="max-w-xs whitespace-nowrap">
                  <span className="text-xs text-blue-600 underline-offset-2 hover:underline">
                    {p.linkedin_url ? (
                      <a href={p.linkedin_url} target="_blank" rel="noreferrer">
                        {p.linkedin_url}
                      </a>
                    ) : (
                      '—'
                    )}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="text-xs text-muted-foreground">
                    {p.job_title || '—'}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="text-xs text-muted-foreground">
                    {p.company || '—'}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {(() => {
                      const schools =
                        typeof p.schools_attended === 'string'
                          ? safeParse(p.schools_attended)
                          : p.schools_attended
                      if (Array.isArray(schools)) {
                        const vals = (schools as any[])
                          .map((s) =>
                            typeof s === 'string' ? s : s?.name ? String(s.name) : ''
                          )
                          .filter(Boolean)
                        return vals.length ? vals.join(', ') : '—'
                      }
                      return '—'
                    })()}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {formatSocialProfiles(p.social_profiles) || '—'}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {formatOrganizations(p.organizations) || '—'}
                  </span>
                </TableCell>
                <TableCell>{renderStatus(p)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="text-xs font-medium">
                    {p.owner_name || <span className="text-muted-foreground">—</span>}
                  </div>
                  {p.owner_title && (
                    <div className="text-[11px] text-muted-foreground">{p.owner_title}</div>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  <span suppressHydrationWarning>
                    {p.created_on
                      ? formatDistanceToNow(new Date(p.created_on), { addSuffix: true })
                      : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {p.processing_seconds != null ? `${p.processing_seconds}s` : '—'}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  No profiles match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}


