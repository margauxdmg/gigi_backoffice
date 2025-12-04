'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { NyneProfile } from '@/types/nyne'

export async function searchProfiles(query: string): Promise<NyneProfile[]> {
  const supabase = createServerClient()
  
  if (!query) return []

  // Exact email
  let { data } = await supabase.from('nyne_profiles_enrichment').select('*').eq('email', query)
  if (data && data.length > 0) return data as NyneProfile[]
  
  // Exact linkedin
  ({ data } = await supabase.from('nyne_profiles_enrichment').select('*').eq('linkedin_url', query))
  if (data && data.length > 0) return data as NyneProfile[]
  
  // Contains firstname
  ({ data } = await supabase.from('nyne_profiles_enrichment').select('*').ilike('firstname', `%${query}%`))
  
  return (data || []) as NyneProfile[]
}

export async function updateProfile(email: string, updates: Partial<NyneProfile>) {
  // Use Service Role Key for updates to bypass RLS policies
  // Fallback to standard client if key is missing (though RLS might block it)
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
    supabase = createServerClient()
  }

  const { error } = await supabase.from('nyne_profiles_enrichment').update(updates).eq('email', email)
  
  if (error) throw new Error(error.message)
  
  revalidatePath('/admin')
  return { success: true }
}
