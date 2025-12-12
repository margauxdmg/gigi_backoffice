import { createClient } from '@/lib/supabase/server'
import { NyneProfile } from '@/types/nyne'
import { notFound } from 'next/navigation'
import { OpsResolveClient } from '@/components/ops-resolve-client'

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

export default async function OpsResolvePage({
  params,
}: {
  params: { userId: string }
}) {
  const supabase = createClient()

  // 1) Fetch only the selected user's basic info
  const { data: userData } = await supabase
    .from('users')
    .select('user_id, email, full_name, title, profile_pic, created_at')
    .eq('user_id', params.userId)
    .maybeSingle()

  if (!userData) {
    return notFound()
  }

  const user = userData as User

  // 2) Fetch connections for this user only (just the profile ids)
  const { data: connectionsData } = await supabase
    .from('connections')
    .select('profile_id')
    .eq('user_id', params.userId)

  const connections = (connectionsData || []) as Pick<Connection, 'profile_id'>[]
  const profileIds = connections.map((c) => c.profile_id)

  if (profileIds.length === 0) {
    return <OpsResolveClient user={user} profiles={[]} />
  }

  // 3) Fetch ALL completed/failed profiles from the DB to avoid URL length issues with large networks (e.g. 26k IDs)
  // We will filter by the user's specific network IDs in memory.
  const { data: profilesData } = await supabase
    .from('nyne_profiles_enrichment')
    .select(
      'profile_id, email, status, firstname, lastname, city, linkedin_url, bio, profile_pic, job_title, company, schools_attended, organizations, social_profiles'
    )
    .in('status', ['completed', 'failed'])

  const rawProfiles = (profilesData || []) as NyneProfile[]
  const userProfileIds = new Set(profileIds)

  // Filter in JS to keep only profiles in this user's network
  const userProfiles = rawProfiles.filter((p) => userProfileIds.has(p.profile_id))

  return <OpsResolveClient user={user} profiles={userProfiles} />
}



