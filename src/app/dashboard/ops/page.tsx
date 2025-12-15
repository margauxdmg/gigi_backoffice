import { createClient } from '@/lib/supabase/server'
import { NyneProfile } from '@/types/nyne'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

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

type AdminActionLog = {
  profile_id: string | null
}

export default async function OpsDashboardPage() {
  const supabase = createClient()
  
  // 1. Fetch all enriched profiles
  // Optimized: select only needed columns, filter by status, and increase range limit
  const { data: profiles, error: profilesError } = await supabase
    .from('nyne_profiles_enrichment')
    .select(
      'profile_id, email, status, linkedin_url, firstname, lastname, city, job_title, company, bio, profile_pic, schools_attended, organizations, social_profiles'
    )
    .in('status', ['completed', 'failed'])
    .range(0, 49999)

  if (profilesError) {
    return <div>Error loading profiles: {profilesError.message}</div>
  }

  const allProfiles = (profiles || []) as NyneProfile[]

  // Already filtered by status in query
  const processedProfiles = allProfiles

  function isMissingCity(city: string | null) {
    if (!city) return true
    const v = city.trim().toLowerCase()
    return !v || v === 'not specified' || v === 'not_specified' || v === 'n/a'
  }

  // New status logic pour Ops (même définition que Dashboard Nyne) :
  // - Not_resolved  => pas de LinkedIn URL associée à cet email
  // - Fully_resolved => LinkedIn trouvé + tous les champs requis présents
  // - Partially_resolved => LinkedIn trouvé mais au moins un champ requis manquant

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

  // Global metrics pour l'onglet Ops
  const partiallyResolvedToDo = processedProfiles.filter(isPartiallyResolvedProfile).length

  // Détail des champs manquants dans les profils partiellement résolus
  const prPartials = processedProfiles.filter(isPartiallyResolvedProfile)
  const prMissingFullName = prPartials.filter(
    (p) => !p.firstname || !p.lastname
  ).length
  const prMissingCity = prPartials.filter((p) => !p.city || isMissingCity(p.city)).length
  const prMissingJobTitle = prPartials.filter((p) => !p.job_title).length
  const prMissingPic = prPartials.filter((p) => !p.profile_pic).length
  const prMissingCompany = prPartials.filter((p) => !p.company).length
  const prMissingSchools = prPartials.filter((p) => !p.schools_attended).length
  const prMissingSocial = prPartials.filter((p) => !p.social_profiles).length
  const prMissingOrgs = prPartials.filter((p) => !p.organizations).length

  const fullyResolved = processedProfiles.filter(isFullyResolvedProfile).length
  const notResolved = processedProfiles.filter(isNotResolvedProfile).length

  // Total profiles to proceed = partiellement résolus + non résolus
  const totalToProceed = partiallyResolvedToDo + notResolved

  // 2. Fetch users, connections and admin actions
  const { data: usersData } = await supabase.from('users').select('*').range(0, 49999)
  const { data: connectionsData } = await supabase.from('connections').select('*').range(0, 49999)
  const { data: actionsData } = await supabase
    .from('admin_action_logs')
    .select('profile_id')
    .range(0, 49999)

  const users = (usersData || []) as User[]
  const connections = (connectionsData || []) as Connection[]
  const actions = (actionsData || []) as AdminActionLog[]

  // Average number of profiles per user to proceed
  const avgProfilesPerUser =
    users.length > 0 ? Math.round(totalToProceed / users.length) : 0

  // Build rows for user table
  const rows = users.map((user) => {
    // All profiles linked to this user (network)
    const userConnections = connections.filter((c) => c.user_id === user.user_id)
    const userProfileIds = new Set(userConnections.map((c) => c.profile_id))

    const userProfiles = processedProfiles.filter((p) =>
      userProfileIds.has(p.profile_id)
    )

    const userPartiallyProfiles = userProfiles.filter(isPartiallyResolvedProfile)
    const userPartiallyCount = userPartiallyProfiles.length

    // Per-user breakdown of partially_resolved by missing field
    const uMissingPic = userPartiallyProfiles.filter((p) => !p.profile_pic).length
    const uMissingLastname = userPartiallyProfiles.filter((p) => !p.lastname).length
    const uMissingCity = userPartiallyProfiles.filter(
      (p) => !p.city || isMissingCity(p.city)
    ).length
    const uMissingLinkedin = userPartiallyProfiles.filter(
      (p) => !p.linkedin_url
    ).length
    const uMissingBio = userPartiallyProfiles.filter((p) => !p.bio).length

    const userFullyOptMissingCount = 0

    const userFullyCount = userProfiles.filter(isFullyResolvedProfile).length

    const userNotResolvedCount = userProfiles.filter(isNotResolvedProfile).length

    // Total checked: number of manual actions on this network
    const totalChecked = actions.filter(
      (a) => a.profile_id && userProfileIds.has(a.profile_id)
    ).length

    const totalNetwork = userProfileIds.size

    return {
      user,
      start_onboarding: user.created_at
        ? new Date(user.created_at).toISOString()
        : null,
      partially: userPartiallyCount,
      fully_check: userFullyCount,
      fully_opt: userFullyOptMissingCount,
      not_resolved: userNotResolvedCount,
      total_checked: totalChecked,
      total_network: totalNetwork,
      missing_pic: uMissingPic,
      missing_lastname: uMissingLastname,
      missing_city: uMissingCity,
      missing_linkedin: uMissingLinkedin,
      missing_bio: uMissingBio,
    }
  })

  // Sort rows – more active networks first (by total_to_proceed within their network)
  rows.sort((a, b) => b.total_network - a.total_network)

  return (
     <div className="space-y-8">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-yellow-100/50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Partially_resolved to do
            </CardTitle>
           </CardHeader>
           <CardContent>
            <div className="text-3xl font-bold text-yellow-700">
              {partiallyResolvedToDo}
            </div>
           </CardContent>
         </Card>
        <Card className="bg-yellow-100/50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Fully_resolved
            </CardTitle>
           </CardHeader>
           <CardContent>
            <div className="text-3xl font-bold text-yellow-700">
              {fullyResolved}
            </div>
           </CardContent>
         </Card>
        <Card className="bg-yellow-100/50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Not_resolved
            </CardTitle>
           </CardHeader>
           <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {notResolved}
            </div>
           </CardContent>
         </Card>

        {/* Second Row */}
        <Card className="col-start-2 bg-yellow-100/50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total profiles to proceed
            </CardTitle>
           </CardHeader>
           <CardContent>
            <div className="text-3xl font-bold text-yellow-700">
              {totalToProceed}
         </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-100/50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg number of profiles per user to proceed
            </CardTitle>
             </CardHeader>
             <CardContent>
            <div className="text-3xl font-bold text-yellow-700">
              {avgProfilesPerUser}
            </div>
             </CardContent>
         </Card>
       </div>
       
      {/* Breakdown de Partially_resolved to do par champ manquant */}
      <Card className="bg-yellow-50/70 border-yellow-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Partially_resolved to do – breakdown by missing field
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Missing full name</div>
              <div className="text-lg font-semibold text-yellow-700">
                {prMissingFullName}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Missing city</div>
              <div className="text-lg font-semibold text-yellow-700">
                {prMissingCity}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Missing job title</div>
              <div className="text-lg font-semibold text-yellow-700">
                {prMissingJobTitle}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Missing profile pic</div>
              <div className="text-lg font-semibold text-yellow-700">
                {prMissingPic}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Missing company</div>
              <div className="text-lg font-semibold text-yellow-700">
                {prMissingCompany}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Missing schools</div>
              <div className="text-lg font-semibold text-yellow-700">
                {prMissingSchools}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Missing social profiles</div>
              <div className="text-lg font-semibold text-yellow-700">
                {prMissingSocial}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Missing organizations</div>
              <div className="text-lg font-semibold text-yellow-700">
                {prMissingOrgs}
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
                <TableHead className="w-[300px]">List of new user</TableHead>
                <TableHead>start_onboarding</TableHead>
                <TableHead className="text-center">
                  partially_resolved_missing_required_fields
                </TableHead>
                <TableHead className="text-center">
                  fully_resolved_to_check
                </TableHead>
                {/* fully_resolved_missing_optional_fields removed in simplified model */}
                <TableHead className="text-center">not_resolved_profile</TableHead>
                <TableHead className="text-center">total_checked</TableHead>
                <TableHead className="text-right">total_network</TableHead>
                <TableHead className="text-right"></TableHead>
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
                        <div className="text-xs text-muted-foreground">
                          {row.user.title}
                        </div>
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
                  <TableCell className="text-center font-medium text-yellow-700">
                    <div>{row.partially}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      pic {row.missing_pic} · ln {row.missing_lastname} · city{' '}
                      {row.missing_city} · li {row.missing_linkedin} · bio{' '}
                      {row.missing_bio}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium text-green-700">
                    {row.fully_check}
                  </TableCell>
                  {/* Removed fully_opt cell to match headers */}
                  <TableCell className="text-center font-medium text-red-600">
                    {row.not_resolved}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {row.total_checked}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {row.total_network}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/ops/${row.user.user_id}`}
                      className="rounded-full border border-yellow-300 bg-yellow-100 px-4 py-1 text-xs font-semibold hover:bg-yellow-200"
                    >
                      Start resolving
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
     </div>
  )
}

