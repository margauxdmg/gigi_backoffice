import { createClient } from '@/lib/supabase/server'
import { NyneProfile } from '@/types/nyne'
import { subHours, startOfMinute } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProcessingTimeChart, InsertsPerMinuteChart } from '@/components/ops-charts'
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic'

function getStatusVariant(status: string) {
  if (status === 'failed') return 'destructive'
  if (status === 'pending') return 'secondary'
  if (status === 'processing') return 'default'
  return 'outline'
}

export default async function OpsPage() {
  const supabase = createClient()
  
  const twentyFourHoursAgo = subHours(new Date(), 24).toISOString()
  
  const { data: profiles, error } = await supabase
    .from('nyne_profiles_enrichment')
    .select('*')
    .gte('created_on', twentyFourHoursAgo)
    .order('created_on', { ascending: true })

  if (error) {
    return <div>Error loading data: {error.message}</div>
  }
  
  const data = profiles as NyneProfile[]
  const total = data.length
  const completed = data.filter(p => p.status === 'completed').length
  const successRate = total ? (completed / total) * 100 : 0
  
  // Assuming failed is anything not completed and not pending/processing if those exist
  const failed = data.filter(p => p.status !== 'completed').length 
  const failedRate = total ? (failed / total) * 100 : 0
  
  const processingTimes = data
    .map(p => p.processing_seconds)
    .filter((s): s is number => s !== null)
    .sort((a, b) => a - b)
    
  const avgProcessing = processingTimes.reduce((a, b) => a + b, 0) / (processingTimes.length || 1)
  
  const p50 = processingTimes[Math.floor(processingTimes.length * 0.5)] || 0
  const p90 = processingTimes[Math.floor(processingTimes.length * 0.9)] || 0
  const p99 = processingTimes[Math.floor(processingTimes.length * 0.99)] || 0
  
  // Inserts per minute
  const insertsPerMinuteMap = new Map<string, number>()
  data.forEach(p => {
    if (p.created_on) {
      const minute = startOfMinute(new Date(p.created_on)).toISOString()
      insertsPerMinuteMap.set(minute, (insertsPerMinuteMap.get(minute) || 0) + 1)
    }
  })
  const insertsPerMinute = Array.from(insertsPerMinuteMap.entries())
    .map(([minute, count]) => ({ minute, count }))
    .sort((a, b) => a.minute.localeCompare(b.minute))

  // Top errors (group by status where not completed)
  const errorsMap = new Map<string, number>()
  data.filter(p => p.status !== 'completed').forEach(p => {
    const err = p.status || 'Unknown'
    errorsMap.set(err, (errorsMap.get(err) || 0) + 1)
  })
  const topErrors = Array.from(errorsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return (
     <div className="space-y-8">
       <h2 className="text-3xl font-bold tracking-tight">Ops Dashboard</h2>
       
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Profiles (24h)</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{total}</div>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{avgProcessing.toFixed(2)}s</div>
             <p className="text-xs text-muted-foreground">P50: {p50}s / P90: {p90}s</p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">P99 Processing</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{p99}s</div>
           </CardContent>
         </Card>
       </div>
       
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
         <div className="col-span-4">
            <ProcessingTimeChart data={data.filter(d => d.processing_seconds !== null)} />
         </div>
         <Card className="col-span-3">
             <CardHeader>
                <CardTitle>Top Errors/Status</CardTitle>
             </CardHeader>
             <CardContent>
               <ul className="space-y-4">
                 {topErrors.map(([err, count]) => (
                   <li key={err} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                     <Badge variant={getStatusVariant(err)} className="capitalize">
                       {err}
                     </Badge>
                     <span className="font-mono font-medium text-muted-foreground">{count}</span>
                   </li>
                 ))}
                 {topErrors.length === 0 && <li className="text-sm text-muted-foreground italic">All systems normal</li>}
               </ul>
             </CardContent>
         </Card>
       </div>
       
       <InsertsPerMinuteChart data={insertsPerMinute} />
     </div>
  )
}
