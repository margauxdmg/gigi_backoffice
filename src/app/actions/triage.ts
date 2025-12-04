'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NyneProfile } from '@/types/nyne'
import { revalidatePath } from 'next/cache'

export type TriageStats = {
  missingPic: number
  missingLastname: number
  missingCity: number
  missingLinkedin: number
  missingBio: number
  totalProfiles: number
}

export async function getTriageStats(): Promise<TriageStats> {
  const supabase = createClient()
  
  const { count: totalProfiles } = await supabase
    .from('nyne_profiles_enrichment')
    .select('*', { count: 'exact', head: true })

  const { count: missingPic } = await supabase
    .from('nyne_profiles_enrichment')
    .select('*', { count: 'exact', head: true })
    .is('profile_pic', null)
    .eq('status', 'completed')

  const { count: missingLastname } = await supabase
    .from('nyne_profiles_enrichment')
    .select('*', { count: 'exact', head: true })
    .is('lastname', null)
    .eq('status', 'completed')

  const { count: missingCity } = await supabase
    .from('nyne_profiles_enrichment')
    .select('*', { count: 'exact', head: true })
    .is('city', null)
    .eq('status', 'completed')
    
  const { count: missingLinkedin } = await supabase
    .from('nyne_profiles_enrichment')
    .select('*', { count: 'exact', head: true })
    .is('linkedin_url', null)
    .eq('status', 'completed')
    
  const { count: missingBio } = await supabase
    .from('nyne_profiles_enrichment')
    .select('*', { count: 'exact', head: true })
    .is('bio', null)
    .eq('status', 'completed')

  return {
    totalProfiles: totalProfiles || 0,
    missingPic: missingPic || 0,
    missingLastname: missingLastname || 0,
    missingCity: missingCity || 0,
    missingLinkedin: missingLinkedin || 0,
    missingBio: missingBio || 0
  }
}

export async function getNextTriageProfile(field: 'profile_pic' | 'lastname' | 'city' | 'linkedin_url' | 'bio'): Promise<NyneProfile | null> {
  const supabase = createClient()
  
  let query = supabase
    .from('nyne_profiles_enrichment')
    .select('*')
    .is(field, null)
  
  if (field === 'profile_pic' || field === 'lastname' || field === 'city' || field === 'bio' || field === 'linkedin_url') {
    query = query.eq('status', 'completed')
  }

  const { data } = await query.limit(1).single()
    
  return data as NyneProfile
}

export async function updateTriageProfile(email: string, updates: Partial<NyneProfile>) {
  // Use Service Role Key for updates to bypass RLS policies if needed
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let supabase
  if (serviceRoleKey) {
    supabase = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } else {
    supabase = createClient()
  }

  const { error } = await supabase
    .from('nyne_profiles_enrichment')
    .update(updates)
    .eq('email', email)
  
  if (error) throw new Error(error.message)
  
  revalidatePath('/admin')
  return { success: true }
}
