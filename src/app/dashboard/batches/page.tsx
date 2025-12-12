import { createClient } from '@/lib/supabase/server'
import { NyneProfile } from '@/types/nyne'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'

export const dynamic = 'force-dynamic'

function isMissingCity(city: string | null) {
  if (!city) return true
  const v = city.trim().toLowerCase()
  return !v || v === 'not specified' || v === 'not_specified' || v === 'n/a' || v === 'na'
}

function hasLinkedin(p: NyneProfile) {
  return !!p.linkedin_url
}

function hasAllRequired(p: NyneProfile) {
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

function statusCategory(p: NyneProfile): 'fully' | 'partially' | 'failed' | 'in_queue' {
  const s = (p.status || '').toLowerCase()
  if (s === 'failed') return 'failed'
  if (s === 'completed') {
    if (hasAllRequired(p)) return 'fully'
    return 'partially'
  }
  return 'in_queue'
}

type BatchRow = {
  batch_tag: string
  total: number
  fully: number
  partially: number
  failed: number
  inQueue: number
  missingFullName: number
  missingCity: number
  missingJob: number
  missingPic: number
  missingCompany: number
}

export default async function BatchesDashboardPage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('nyne_profiles_enrichment')
    .select(
      'profile_id, batch_tag, status, firstname, lastname, city, linkedin_url, profile_pic, job_title, company, bio, schools_attended, organizations, social_profiles'
    )

  if (error) {
    return <div>Error loading batches: {error.message}</div>
  }

  const profiles = (data || []) as NyneProfile[]

  const batchesMap = new Map<string, NyneProfile[]>()

  profiles.forEach((p) => {
    const tag = (p.batch_tag as string | null) || '—'
    if (!batchesMap.has(tag)) batchesMap.set(tag, [])
    batchesMap.get(tag)!.push(p)
  })

  const rows: BatchRow[] = []

  batchesMap.forEach((list, tag) => {
    const total = list.length || 1
    let fully = 0
    let partially = 0
    let failed = 0
    let inQueue = 0

    let missingFullName = 0
    let missingCity = 0
    let missingJob = 0
    let missingPic = 0
    let missingCompany = 0

    list.forEach((p) => {
      const cat = statusCategory(p)
      if (cat === 'fully') fully++
      else if (cat === 'partially') partially++
      else if (cat === 'failed') failed++
      else inQueue++

      if (cat === 'partially') {
        if (!p.firstname || !p.lastname) missingFullName++
        if (!p.city || isMissingCity(p.city)) missingCity++
        if (!p.job_title) missingJob++
        if (!p.profile_pic) missingPic++
        if (!p.company) missingCompany++
      }
    })

    rows.push({
      batch_tag: tag,
      total,
      fully,
      partially,
      failed,
      inQueue,
      missingFullName,
      missingCity,
      missingJob,
      missingPic,
      missingCompany,
    })
  })

  rows.sort((a, b) => b.total - a.total)

  const grandTotal = profiles.length || 1
  const grandFully = rows.reduce((acc, r) => acc + r.fully, 0)
  const grandPartially = rows.reduce((acc, r) => acc + r.partially, 0)
  const grandFailed = rows.reduce((acc, r) => acc + r.failed, 0)
  const grandInQueue = rows.reduce((acc, r) => acc + r.inQueue, 0)
  const pct = (n: number) => ((n / grandTotal) * 100).toFixed(1)

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight">Dashboard Batches</h2>
        <p className="text-xs text-muted-foreground">
          Overview of enrichment progress by batch_tag.
        </p>
      </div>

      {/* Top metrics */}
      <div className="grid gap-4 md:grid-cols-4 max-w-5xl">
        <Card className="bg-yellow-100/60 border-yellow-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Fully resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-700">
              {grandFully} <span className="text-sm font-semibold">({pct(grandFully)}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-100/60 border-yellow-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Partially resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-700">
              {grandPartially}{' '}
              <span className="text-sm font-semibold">({pct(grandPartially)}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-100/60 border-yellow-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Not resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-600">
              {grandFailed}{' '}
              <span className="text-sm font-semibold">({pct(grandFailed)}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-100/60 border-gray-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              In queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-gray-600">
              {grandInQueue}{' '}
              <span className="text-sm font-semibold">({pct(grandInQueue)}%)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-batch table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Batches overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch tag</TableHead>
                  <TableHead className="text-right">Profiles</TableHead>
                  <TableHead className="text-right">% Fully</TableHead>
                  <TableHead className="text-right">% Partially</TableHead>
                  <TableHead className="text-right">% Not resolved</TableHead>
                  <TableHead className="text-right">% In queue</TableHead>
                  <TableHead className="text-right">Missing full name</TableHead>
                  <TableHead className="text-right">Missing city</TableHead>
                  <TableHead className="text-right">Missing job title</TableHead>
                  <TableHead className="text-right">Missing profile pic</TableHead>
                  <TableHead className="text-right">Missing company</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const pctFully = ((row.fully / row.total) * 100).toFixed(1)
                  const pctPartially = ((row.partially / row.total) * 100).toFixed(1)
                  const pctFailed = ((row.failed / row.total) * 100).toFixed(1)
                  const pctInQueue = ((row.inQueue / row.total) * 100).toFixed(1)
                  return (
                    <TableRow key={row.batch_tag}>
                      <TableCell className="font-medium">{row.batch_tag}</TableCell>
                      <TableCell className="text-right">{row.total}</TableCell>
                      <TableCell className="text-right text-emerald-700">
                        {pctFully}%
                      </TableCell>
                      <TableCell className="text-right text-amber-700">
                        {pctPartially}%
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {pctFailed}%
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {pctInQueue}%
                      </TableCell>
                      <TableCell className="text-right">{row.missingFullName}</TableCell>
                      <TableCell className="text-right">{row.missingCity}</TableCell>
                      <TableCell className="text-right">{row.missingJob}</TableCell>
                      <TableCell className="text-right">{row.missingPic}</TableCell>
                      <TableCell className="text-right">{row.missingCompany}</TableCell>
                    </TableRow>
                  )
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No batches found. Make sure nyne_profiles_enrichment has a batch_tag
                      column populated.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


