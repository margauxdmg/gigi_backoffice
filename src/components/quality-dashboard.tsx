'use client'

import { useState, useMemo } from 'react'
import { NyneProfile } from '@/types/nyne'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Badge } from "@/components/ui/badge"

export function QualityDashboard({ initialData }: { initialData: NyneProfile[] }) {
  const [probabilityFilter, setProbabilityFilter] = useState<string>('all')

  const filteredData = useMemo(() => {
    if (probabilityFilter === 'all') return initialData
    return initialData.filter(p => p.probability === probabilityFilter)
  }, [initialData, probabilityFilter])

  const scores = useMemo(() => {
    return filteredData.map(p => {
      let score = 0
      if (p.linkedin_url) score++
      if (p.bio) score++
      if (p.city) score++
      if (p.organizations && Array.isArray(p.organizations) && p.organizations.length > 0) score++
      if (p.schools_attended && Array.isArray(p.schools_attended) && p.schools_attended.length > 0) score++
      if (p.profile_pic) score++
      return { ...p, score }
    })
  }, [filteredData])

  const averageScore = useMemo(() => {
    if (scores.length === 0) return 0
    const sum = scores.reduce((acc, curr) => acc + curr.score, 0)
    return sum / scores.length
  }, [scores])

  const histogramData = useMemo(() => {
    const hist = [0, 0, 0, 0, 0, 0, 0] // 0 to 6
    scores.forEach(p => {
      hist[p.score]++
    })
    return hist.map((count, score) => ({ score, count }))
  }, [scores])

  const lowScoreProfiles = useMemo(() => {
    return scores.filter(p => p.score <= 2)
  }, [scores])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Data Quality</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Filter Probability:</span>
          <Select value={probabilityFilter} onValueChange={setProbabilityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select probability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(2)} / 6.0</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Quality Profiles (Score ≤ 2)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowScoreProfiles.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData}>
                <XAxis 
                  dataKey="score" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low Quality Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Probability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowScoreProfiles.slice(0, 20).map((profile) => (
                <TableRow key={profile.email}>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>{profile.score}</TableCell>
                  <TableCell>{profile.status}</TableCell>
                  <TableCell>
                    <Badge variant={
                        profile.probability === 'high' ? 'default' : 
                        profile.probability === 'medium' ? 'secondary' : 'outline'
                    }>
                        {profile.probability}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {lowScoreProfiles.length > 20 && (
                  <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                          ... and {lowScoreProfiles.length - 20} more
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

