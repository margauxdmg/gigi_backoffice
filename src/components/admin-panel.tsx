'use client'

import { useState } from 'react'
import { searchProfiles, updateProfile } from '@/app/actions/admin'
import { NyneProfile } from '@/types/nyne'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { TriageSection } from '@/components/triage-section'

export default function AdminPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NyneProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<NyneProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const data = await searchProfiles(query)
      setResults(data)
      if (data.length === 0) setMessage('No profiles found.')
      else setSelectedProfile(null) // Reset selection on new search
    } catch (err) {
      setMessage('Error searching.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfile) return

    setLoading(true)
    try {
      await updateProfile(selectedProfile.email, {
        firstname: selectedProfile.firstname,
        lastname: selectedProfile.lastname,
        city: selectedProfile.city,
        status: selectedProfile.status,
        linkedin_url: selectedProfile.linkedin_url,
        bio: selectedProfile.bio,
      })
      setMessage('Profile updated successfully.')
    } catch (error) {
      setMessage('Error updating profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleRerun = async () => {
    if (!selectedProfile) return
    setLoading(true)
    try {
      const res = await fetch('/api/rerun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedProfile.email }),
      })
      if (res.ok) setMessage('Re-run triggered.')
      else setMessage('Failed to trigger re-run.')
    } catch (error) {
      setMessage('Error triggering re-run.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Search Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input 
              placeholder="Search by email, LinkedIn URL, or Firstname..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" disabled={loading}>Search</Button>
          </form>
          {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      {/* Show Triage Section only when not editing a specific profile and no active search results (or always show it below search?) 
          User said: "space below the search". 
          Let's show it if no profile is selected.
      */}
      {!selectedProfile && results.length === 0 && (
          <TriageSection />
      )}

      {results.length > 0 && !selectedProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {results.map(profile => (
                <li key={profile.email} className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer" onClick={() => setSelectedProfile(profile)}>
                  <div>
                    <div className="font-medium">{profile.firstname || 'No Name'} {profile.lastname || ''}</div>
                    <div className="text-sm text-muted-foreground">{profile.email}</div>
                  </div>
                  <Button variant="ghost" size="sm">Edit</Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {selectedProfile && (
        <Card>
          {/* ... (Edit profile card content same as before) ... */}

          <CardHeader>
             <div className="flex justify-between items-center">
                <CardTitle>Edit Profile: {selectedProfile.email}</CardTitle>
                <Button variant="outline" onClick={() => setSelectedProfile(null)}>Back to Results</Button>
             </div>
          </CardHeader>
          <CardContent>
            <form id="edit-form" onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstname">Firstname</Label>
                  <Input 
                    id="firstname" 
                    value={selectedProfile.firstname || ''} 
                    onChange={e => setSelectedProfile({...selectedProfile, firstname: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    value={selectedProfile.city || ''} 
                    onChange={e => setSelectedProfile({...selectedProfile, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Input 
                    id="status" 
                    value={selectedProfile.status || ''} 
                    onChange={e => setSelectedProfile({...selectedProfile, status: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input 
                    id="linkedin" 
                    value={selectedProfile.linkedin_url || ''} 
                    onChange={e => setSelectedProfile({...selectedProfile, linkedin_url: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {/* Using Input as Textarea for simplicity or if shadcn textarea not installed. I'll use Input for now or standard textarea with tailwind classes */}
                <textarea 
                  id="bio" 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedProfile.bio || ''} 
                  onChange={e => setSelectedProfile({...selectedProfile, bio: e.target.value})}
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
             <Button variant="destructive" type="button" onClick={handleRerun} disabled={loading}>
               Force Re-run
             </Button>
             <Button type="submit" form="edit-form" disabled={loading}>
               Save Changes
             </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

