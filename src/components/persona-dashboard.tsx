'use client'

import { useMemo } from 'react'
import { NyneProfile } from '@/types/nyne'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export function PersonaDashboard({ data, rawData }: { data: NyneProfile[], rawData?: any[] }) {
  
  const cityData = useMemo(() => {
    const counts: Record<string, number> = {}
    data.forEach(p => {
      if (p.city) counts[p.city] = (counts[p.city] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, value]) => ({ name, value }))
  }, [data])

  const schoolData = useMemo(() => {
    const counts: Record<string, number> = {}
    data.forEach(p => {
      if (p.schools_attended && Array.isArray(p.schools_attended)) {
        p.schools_attended.forEach((school: any) => {
             const name = typeof school === 'string' ? school : (school?.name || 'Unknown')
             if (name) counts[name] = (counts[name] || 0) + 1
        })
      }
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([name, value]) => ({ name, value }))
  }, [data])

  // Helper function to normalize job titles
  const normalizeJobTitle = (title: string): string => {
    const t = title.toLowerCase()
    if (t.includes('founder') || t.includes('co-founder') || t.includes('founding')) return 'Founder / Co-Founder'
    if (t.includes('ceo') || t.includes('chief executive officer')) return 'CEO'
    if (t.includes('cto') || t.includes('chief technology officer')) return 'CTO'
    if (t.includes('product manager') || t.includes('pm') || t.includes('head of product') || t.includes('vp product')) return 'Product Manager / Head'
    if (t.includes('engineer') || t.includes('developer')) return 'Engineer / Developer'
    if (t.includes('designer') || t.includes('ux') || t.includes('ui')) return 'Designer'
    if (t.includes('investor') || t.includes('partner') || t.includes('vc')) return 'Investor / VC'
    if (t.includes('director')) return 'Director'
    if (t.includes('manager')) return 'Manager'
    if (t.includes('consultant')) return 'Consultant'
    if (t.includes('student')) return 'Student'
    if (t.includes('researcher') || t.includes('scientist')) return 'Researcher / Scientist'
    return 'Other'
  }
  
  const jobTitleData = useMemo(() => {
    const counts: Record<string, number> = {}
    const sourceData = (rawData && rawData.length > 0) ? rawData : data
    
    sourceData.forEach((p: any) => {
      let title = ''
      if (p.organizations && Array.isArray(p.organizations)) {
        p.organizations.forEach((org: any) => {
             if (org?.title) title = org.title
        })
      }
      else if (p.headline) {
         title = p.headline
      }

      if (title) {
          const normalized = normalizeJobTitle(title)
          counts[normalized] = (counts[normalized] || 0) + 1
      }
    })
    
    // Filter out 'Other' if desired, or keep it at the end
    const entries = Object.entries(counts).filter(([k]) => k !== 'Other')
    const otherCount = counts['Other'] || 0

    const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 10)
    
    // Optionally add Other back at the end if it's significant, but usually distracts
    // if (otherCount > 0) sorted.push(['Other', otherCount])
    
    return sorted.map(([name, value]) => ({ name, value }))
  }, [data, rawData])

  const companyData = useMemo(() => {
    const counts: Record<string, number> = {}
    const sourceData = (rawData && rawData.length > 0) ? rawData : data

    sourceData.forEach((p: any) => {
      if (p.organizations && Array.isArray(p.organizations)) {
        p.organizations.forEach((org: any) => {
             const name = org?.name
             if (name) counts[name] = (counts[name] || 0) + 1
        })
      }
      else if (p.headline && p.headline.includes(' at ')) {
          const parts = p.headline.split(' at ')
          if (parts.length > 1) {
              const company = parts[parts.length - 1].trim()
              if (company) counts[company] = (counts[company] || 0) + 1
          }
      }
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, value]) => ({ name: name.substring(0, 30) + (name.length>30?'...':''), value }))
  }, [data, rawData])

  const probabilityData = useMemo(() => {
    const counts: Record<string, number> = {}
    data.forEach(p => {
      const prob = p.probability || 'Unknown'
      counts[prob] = (counts[prob] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [data])

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">Persona & Distribution</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Probability Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={probabilityData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                     outerRadius={80}
                     fill="#8884d8"
                     dataKey="value"
                   >
                     {probabilityData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Cities</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={cityData} layout="vertical">
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} interval={0} />
                   <Tooltip />
                   <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
          <CardHeader>
            <CardTitle>Top Categories (Job Titles)</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={jobTitleData} layout="vertical">
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 10}} interval={0} />
                   <Tooltip />
                   <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Companies</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={companyData} layout="vertical">
                    <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 10}} interval={0} />
                   <Tooltip />
                   <Bar dataKey="value" fill="#FF8042" radius={[0, 4, 4, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
          <CardHeader>
            <CardTitle>Top Schools</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[400px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={schoolData.slice(0, 20)}>
                   <XAxis dataKey="name" hide /> {/* Too many labels */}
                   <YAxis />
                   <Tooltip />
                   <Bar dataKey="value" fill="#0088FE" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
               <p className="text-xs text-muted-foreground mt-2 text-center">Displaying top 20 of 50 for readability</p>
             </div>
          </CardContent>
        </Card>
    </div>
  )
}
