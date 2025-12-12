import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NyneProfile } from '@/types/nyne'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from 'date-fns'
import { NyneProfilesTable } from '@/components/nyne-profiles-table'
// import { DataChat } from '@/components/data-chat'

export const dynamic = 'force-dynamic'

type Connection = {
  connection_id: string
  user_id: string
  profile_id: string
  created_at: string
}

type User = {
  user_id: string
  email: string
  full_name: string
  title: string
  profile_pic: string | null
  created_at: string
}

export default async function DashboardNynePage() {
  const supabase = createClient()

  // 1. Fetch profiles for metrics
  // Optimized select to reduce payload size from DB to Server
  const { data: profiles, error: profilesError } = await supabase
    .from('nyne_profiles_enrichment')
    .select(
      'profile_id, email, status, linkedin_url, firstname, lastname, city, job_title, company, bio, profile_pic, schools_attended, organizations, social_profiles, processing_seconds, batch_tag, created_on'
    )
    .order('created_on', { ascending: false })

  if (profilesError) return <div>Error loading profiles: {profilesError.message}</div>

  const rawProfiles = profiles as NyneProfile[]
  // In Dashboard Nyne, we ONLY want to see profiles that are 'completed' or 'failed'.
  // We ignore 'processing', 'in_queue' or 'not_resolved_yet'.
  const allProfiles = rawProfiles.filter(
    (p) => p.status === 'completed' || p.status === 'failed'
  )
  const processedProfiles = allProfiles
  const totalProcessedBase = processedProfiles.length || 1 // Avoid divide by zero

  // --- GLOBAL METRICS (Top Cards) ---

  function isMissingCity(city: string | null) {
    if (!city) return true
    const v = city.trim().toLowerCase()
    return !v || v === 'not specified' || v === 'not_specified' || v === 'n/a'
  }

  // New status logic aligned with your definition:
  // - Not resolved  => no LinkedIn URL for this email
  // - Fully         => LinkedIn found AND all required fields present
  // - Partially     => LinkedIn found BUT at least one required field missing

  const hasLinkedin = (p: NyneProfile) => !!p.linkedin_url

  const hasAllRequired = (p: NyneProfile) =>
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

  const isFullyResolvedProfile = (p: NyneProfile) => hasLinkedin(p) && hasAllRequired(p)
  const isPartiallyResolvedProfile = (p: NyneProfile) =>
    hasLinkedin(p) && !hasAllRequired(p)
  const isNotResolvedProfile = (p: NyneProfile) => !hasLinkedin(p)

  const partiallyResolved = processedProfiles.filter(isPartiallyResolvedProfile).length
  const fullyResolved = processedProfiles.filter(isFullyResolvedProfile).length
  const notResolved = processedProfiles.filter(isNotResolvedProfile).length

  // Breakdown of partially_resolved by missing required field
  const partiallyProfiles = processedProfiles.filter(isPartiallyResolvedProfile)

  const missingFullName = partiallyProfiles.filter(
    (p) => !p.firstname || !p.lastname
  ).length
  const missingCity = partiallyProfiles.filter((p) => !p.city || isMissingCity(p.city)).length
  const missingJobTitle = partiallyProfiles.filter((p) => !p.job_title).length
  const missingPic = partiallyProfiles.filter((p) => !p.profile_pic).length
  const missingCompany = partiallyProfiles.filter((p) => !p.company).length
  const missingSchools = partiallyProfiles.filter((p) => !p.schools_attended).length
  const missingSocial = partiallyProfiles.filter((p) => !p.social_profiles).length
  const missingOrgs = partiallyProfiles.filter((p) => !p.organizations).length

  // Avg processing time (seconds)
  const times = allProfiles
    .map(p => p.processing_seconds)
    .filter((t): t is number => typeof t === 'number')
  const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0


  // 2. Fetch Users & Connections for the User Table
  const { data: usersData } = await supabase.from('users').select('*')
  const { data: connectionsData } = await supabase.from('connections').select('*')
  
  const users = (usersData || []) as User[]
  const connections = (connectionsData || []) as Connection[]

  // Map each profile_id to its first associated user (owner of the network)
  const profileOwnerMap = new Map<string, { name: string | null; title: string | null }>()
  connections.forEach((c) => {
    if (!profileOwnerMap.has(c.profile_id)) {
      const owner = users.find((u) => u.user_id === c.user_id)
      if (owner) {
        profileOwnerMap.set(c.profile_id, {
          name: owner.full_name,
          title: owner.title,
        })
      }
    }
  })

  // Build rows: User -> Connections -> Profiles stats
  // Now using REAL JOIN logic: User.user_id -> Connection.user_id -> Connection.profile_id -> NyneProfile.profile_id
  const rows = users.map(user => {
    // 1. Get all profile_ids connected to this user
    const userConnections = connections.filter(c => c.user_id === user.user_id)
    const userProfileIds = new Set(userConnections.map(c => c.profile_id))
    
    // 2. Filter the enrichment profiles that match these IDs
    const userProfiles = allProfiles.filter(p => userProfileIds.has(p.profile_id))
    const totalUserProfiles = userProfiles.length || 1 // Avoid divide by zero

    // 3. Calculate metrics specifically for this user's network
    
    // Avg process time for this user's profiles
    const userTimes = userProfiles
        .map(p => p.processing_seconds)
        .filter((t): t is number => typeof t === 'number')
    const userAvgTime = userTimes.length ? Math.round(userTimes.reduce((a, b) => a + b, 0) / userTimes.length) : 0

    // Partially / Fully / Not resolved counts with new rules
    const userPartiallyProfiles = userProfiles.filter(isPartiallyResolvedProfile)
    const userPartiallyCount = userPartiallyProfiles.length

    const userFullyCount = userProfiles.filter(isFullyResolvedProfile).length
    const userNotResolvedCount = userProfiles.filter(isNotResolvedProfile).length

    // Per-user breakdown of partially_resolved by missing field
    const uMissingPic = userPartiallyProfiles.filter((p) => !p.profile_pic).length
    const uMissingLastname = userPartiallyProfiles.filter((p) => !p.lastname).length
    const uMissingCity = userPartiallyProfiles.filter(
      (p) => !p.city || isMissingCity(p.city)
    ).length
    const uMissingLinkedin = userPartiallyProfiles.filter((p) => !p.linkedin_url).length
    const uMissingBio = userPartiallyProfiles.filter((p) => !p.bio).length

    return {
      user,
      start_onboarding: user.created_at ? new Date(user.created_at).toISOString() : null,
      avg_process_time: userAvgTime,
      partially: Math.round((userPartiallyCount / totalUserProfiles) * 100),
      fully_check: Math.round((userFullyCount / totalUserProfiles) * 100),
      not_resolved: Math.round((userNotResolvedCount / totalUserProfiles) * 100),
      total_network: userProfiles.length,
      missing_pic: uMissingPic,
      missing_lastname: uMissingLastname,
      missing_city: uMissingCity,
      missing_linkedin: uMissingLinkedin,
      missing_bio: uMissingBio,
    }
  })

  // Sort rows (optional, e.g. by most recent onboarding)
  rows.sort((a, b) => new Date(b.user.created_at).getTime() - new Date(a.user.created_at).getTime())

  return (
    <div className="space-y-8">
      {/* Top Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-yellow-100/60 border-yellow-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Total Partially_resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-yellow-700">
              {Math.round((partiallyResolved / totalProcessedBase) * 100)}%
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-100/60 border-yellow-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Total Fully_resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-emerald-700">
              {Math.round((fullyResolved / totalProcessedBase) * 100)}%
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-100/60 border-yellow-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Total Not_resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-red-600">
              {Math.round((notResolved / totalProcessedBase) * 100)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 md:grid-cols-2 max-w-xl">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Total profiles processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-800">
              {processedProfiles.length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Avg processing time / mail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-800">
              {avgTime} sec
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown of partially_resolved by missing field */}
      <Card className="bg-yellow-50/80 border-yellow-200">
        <CardHeader className="pb-1 border-b border-yellow-200/70">
          <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Partially_resolved – breakdown by missing field
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6 text-sm">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Missing full name</div>
              <div className="text-2xl font-semibold text-yellow-700">{missingFullName}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Missing city</div>
              <div className="text-2xl font-semibold text-yellow-700">{missingCity}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Missing job title</div>
              <div className="text-2xl font-semibold text-yellow-700">
                {missingJobTitle}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Missing profile pic</div>
              <div className="text-2xl font-semibold text-yellow-700">{missingPic}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Missing company</div>
              <div className="text-2xl font-semibold text-yellow-700">
                {missingCompany}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Missing schools</div>
              <div className="text-2xl font-semibold text-yellow-700">
                {missingSchools}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                Missing social profiles
              </div>
              <div className="text-2xl font-semibold text-yellow-700">
                {missingSocial}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Missing organizations</div>
              <div className="text-2xl font-semibold text-yellow-700">
                {missingOrgs}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List Table */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 relative">
            <input 
                type="text" 
                placeholder="Search users who did the onboarding" 
                className="w-full pl-10 h-12 rounded-full border border-gray-300 bg-white px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-4 text-gray-400">🔍</span>
        </div>

        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">User</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-center">Avg time / email</TableHead>
                <TableHead className="text-center">
                  Partially resolved
                </TableHead>
                <TableHead className="text-center">Fully resolved</TableHead>
                <TableHead className="text-center">Not resolved</TableHead>
                <TableHead className="text-right">Network size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.user.user_id} className="h-20">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={row.user.profile_pic || ''} />
                        <AvatarFallback>{row.user.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold">{row.user.full_name}</div>
                        <div className="text-xs text-muted-foreground">{row.user.title}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.start_onboarding ? (
                      <span suppressHydrationWarning>
                        {formatDistanceToNow(new Date(row.start_onboarding), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {row.avg_process_time} sec
                  </TableCell>
                  <TableCell
                    className={`text-center font-semibold ${
                      row.partially > 20 ? 'text-yellow-700' : ''
                    }`}
                  >
                    <div className="text-base">{row.partially}%</div>
                    <details className="mt-1 text-[11px] text-muted-foreground">
                      <summary className="cursor-pointer underline underline-offset-2 list-none">
                        view breakdown
                      </summary>
                      <div className="mt-1 space-y-0.5">
                        <div>pic: {row.missing_pic}</div>
                        <div>last name: {row.missing_lastname}</div>
                        <div>city: {row.missing_city}</div>
                        <div>LinkedIn: {row.missing_linkedin}</div>
                        <div>bio: {row.missing_bio}</div>
                      </div>
                    </details>
                  </TableCell>
                  <TableCell
                    className={`text-center font-bold ${
                      row.fully_check > 50 ? 'text-green-600' : ''
                    }`}
                  >
                    {row.fully_check}%
                  </TableCell>
                  <TableCell
                    className={`text-center font-bold ${
                      row.not_resolved > 30 ? 'text-red-600' : ''
                    }`}
                  >
                    {row.not_resolved}%
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {row.total_network}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* All profiles in network */}
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground italic">
          * Displaying the latest 1000 profiles for performance. Global metrics (top cards) are calculated on the full dataset.
        </div>
        <NyneProfilesTable
          profiles={allProfiles.slice(0, 1000).map((p) => {
            const owner = profileOwnerMap.get(p.profile_id)
            return {
              ...p,
              owner_name: owner?.name ?? null,
              owner_title: owner?.title ?? null,
            }
          })}
        />
        {/* <DataChat /> */}
      </div>
    </div>
  )
}
