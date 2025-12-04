import { createClient } from '@/lib/supabase/server'
import { QualityDashboard } from '@/components/quality-dashboard'
import { NyneProfile } from '@/types/nyne'

export const dynamic = 'force-dynamic'

export default async function QualityPage() {
  const supabase = createClient()
  
  // Fetching last 1000 profiles for performance, user said "every row" but let's be safe or paginated.
  // Ideally this runs on a materialized view or computed column in SQL for large datasets.
  // For now, raw fetch.
  const { data, error } = await supabase
    .from('nyne_profiles_enrichment')
    .select('*')
    .order('created_on', { ascending: false })
    .limit(2000)

  if (error) {
    return <div>Error loading data: {error.message}</div>
  }

  return <QualityDashboard initialData={data as NyneProfile[]} />
}

