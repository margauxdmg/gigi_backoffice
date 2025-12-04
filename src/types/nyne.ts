export type NyneProfile = {
  email: string
  start_time: string | null
  end_time: string | null
  processing_seconds: number | null
  processing_minutes: number | null
  firstname: string | null
  lastname: string | null
  headline: string | null
  bio: string | null
  city: string | null
  probability: 'high' | 'medium' | 'low' | string | null
  profile_pic: string | null
  linkedin_url: string | null
  schools_attended: any[] | null // jsonb
  social_profiles: any | null // jsonb
  organizations: any[] | null // jsonb
  completed_on: string | null
  created_on: string | null
  status: string | null
  created_at: string
  updated_at: string | null
}

export type QualityScore = {
  score: number
  profile: NyneProfile
}
