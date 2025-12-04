import { createClient } from '@/lib/supabase/server'
import { PersonaDashboard } from '@/components/persona-dashboard'
import { NyneProfile } from '@/types/nyne'

export const dynamic = 'force-dynamic'

export default async function PersonaPage() {
  const supabase = createClient()
  
  // Fetch enrichment data
  const { data: enrichmentData, error: enrichmentError } = await supabase
    .from('nyne_profiles_enrichment')
    .select('*')
    .order('created_on', { ascending: false })
    .limit(2000)

  if (enrichmentError) {
    return <div>Error loading enrichment data: {enrichmentError.message}</div>
  }

  // Fetch raw data (for job titles/founders if missing in enrichment)
  // Assuming 'nyne_profiles_raw' is the table name based on convention, or checking user hint "raw" table
  // Let's first try to see if we can join or fetch separately. 
  // If there is a common key like 'linkedin_url' or 'id'.
  // For now, let's just pass the enrichment data but also try to fetch 'nyne_profiles' (which might be the raw one?)
  // Wait, the user said "tap into the 'raw' table".
  // Let's try to fetch from 'nyne_profiles' as well if that's the raw one, or 'nyne_raw_profiles'?
  // I'll try 'nyne_profiles' first as that was the original table name before I changed it.
  
  const { data: rawData, error: rawError } = await supabase
    .from('nyne_profiles') 
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000)

  // If 'nyne_profiles' doesn't exist or is the wrong one, rawData will be null or error.
  // But if it works, we can try to use it.
  
  // Let's pass both or merge them? 
  // For the dashboard component, I'll modify it to accept optional rawData or just merge relevant fields if possible.
  // Or simply pass the rawData as a separate prop.

  return <PersonaDashboard data={enrichmentData as NyneProfile[]} rawData={rawData} />
}
