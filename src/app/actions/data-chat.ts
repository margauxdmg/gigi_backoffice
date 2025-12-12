'use server'

import { createClient } from '@/lib/supabase/server'
import { NyneProfile } from '@/types/nyne'

type ChatAnswer = {
  answer: string
}

type PlanIntent = 'global_status_breakdown' | 'status_for_email'

type QueryPlan = {
  intent: PlanIntent
  filters?: {
    email?: string
  }
}

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

function statusCategory(p: NyneProfile): 'fully' | 'partially' | 'failed' {
  if (!hasLinkedin(p)) return 'failed'
  if (hasAllRequired(p)) return 'fully'
  return 'partially'
}

async function handleGlobalStatus(): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('nyne_profiles_enrichment')
    .select(
      'profile_id, status, profile_pic, firstname, lastname, city, linkedin_url, bio, job_title, company, schools_attended, organizations, social_profiles'
    )
    .limit(5000)

  if (error || !data) {
    return `I couldn't query Supabase: ${error?.message ?? 'unknown error'}.`
  }

  const profiles = data as NyneProfile[]
  if (profiles.length === 0) {
    return 'There are currently no profiles in nyne_profiles_enrichment.'
  }

  let fully = 0
  let partially = 0
  let failed = 0

  let missingFullName = 0
  let missingCity = 0
  let missingJob = 0
  let missingPic = 0
  let missingCompany = 0
  let missingSchools = 0
  let missingSocial = 0
  let missingOrgs = 0

  profiles.forEach((p) => {
    const cat = statusCategory(p)
    if (cat === 'fully') fully++
    else if (cat === 'partially') partially++
    else failed++

    if (cat === 'partially') {
      if (!p.firstname || !p.lastname) missingFullName++
      if (!p.city || isMissingCity(p.city)) missingCity++
      if (!p.job_title) missingJob++
      if (!p.profile_pic) missingPic++
      if (!p.company) missingCompany++
      if (!p.schools_attended) missingSchools++
      if (!p.social_profiles) missingSocial++
      if (!p.organizations) missingOrgs++
    }
  })

  const total = profiles.length
  const pct = (n: number) => ((n / total) * 100).toFixed(1)

  const lines = [
    `Total profiles: ${total}`,
    `- Fully resolved: ${fully} (${pct(fully)}%)`,
    `- Partially resolved: ${partially} (${pct(partially)}%)`,
    `- Not resolved: ${failed} (${pct(failed)}%)`,
    '',
    'Among partially resolved profiles, missing fields are:',
    `- Full name: ${missingFullName}`,
    `- City: ${missingCity}`,
    `- Job title: ${missingJob}`,
    `- Profile pic: ${missingPic}`,
    `- Company: ${missingCompany}`,
    `- Schools: ${missingSchools}`,
    `- Social profiles: ${missingSocial}`,
    `- Organizations: ${missingOrgs}`,
  ]

  return lines.join('\n')
}

async function handleStatusForEmail(email: string): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('nyne_profiles_enrichment')
    .select(
      'profile_id, status, firstname, lastname, city, linkedin_url, bio, job_title, company, schools_attended, organizations, social_profiles'
    )
    .eq('email', email)
    .limit(10)

  if (error) {
    return `Error while looking up ${email}: ${error.message}`
  }

  const profiles = (data || []) as NyneProfile[]
  if (profiles.length === 0) {
    return `No profile found for email ${email}.`
  }

  const lines: string[] = []
  profiles.forEach((p, idx) => {
    const cat = statusCategory(p)
    lines.push(
      `Profile #${idx + 1} – status: ${cat.toUpperCase()} (raw: ${p.status ?? 'null'})`
    )
    lines.push(
      `Name: ${p.firstname ?? '∅'} ${p.lastname ?? ''} | City: ${
        p.city ?? '∅'
      } | Job: ${p.job_title ?? '∅'} @ ${p.company ?? '∅'}`
    )
    lines.push(`LinkedIn: ${p.linkedin_url ?? '∅'}`)

    const missing: string[] = []
    if (!p.firstname || !p.lastname) missing.push('full name')
    if (!p.city || isMissingCity(p.city)) missing.push('city')
    if (!p.profile_pic) missing.push('profile pic')
    if (!p.job_title) missing.push('job title')
    if (!p.company) missing.push('company')
    if (!p.bio) missing.push('bio')
    if (!p.schools_attended) missing.push('schools')
    if (!p.social_profiles) missing.push('social profiles')
    if (!p.organizations) missing.push('organizations')

    lines.push(
      missing.length
        ? `Missing fields: ${missing.join(', ')}`
        : 'No required fields missing (according to current rules).'
    )
    lines.push('') // blank line
  })

  return lines.join('\n')
}

async function getPlanFromLLM(question: string): Promise<QueryPlan | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const systemPrompt = `
You are a routing assistant for the "Gigi admin" internal tool.
You MUST output ONLY a JSON object with this shape:
{"intent": "global_status_breakdown" | "status_for_email", "filters": { "email"?: "string" }}

Definitions:
- global_status_breakdown: user wants overall numbers for fully / partially / not resolved profiles, or global stats on missing fields.
- status_for_email: user asks about a specific profile identified by email (any natural language but clearly about a single email).

Rules:
- Never invent columns or tables.
- Never generate SQL.
- If you are unsure, prefer "global_status_breakdown".
`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0,
        max_tokens: 150,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API error', await response.text())
      return null
    }

    const json: any = await response.json()
    const content: string | undefined =
      json?.choices?.[0]?.message?.content ?? undefined
    if (!content) return null

    // The model is instructed to return raw JSON
    const plan = JSON.parse(content) as QueryPlan
    if (!plan || !plan.intent) return null
    return plan
  } catch (err) {
    console.error('Failed to get plan from LLM', err)
    return null
  }
}

export async function askData(question: string): Promise<ChatAnswer> {
  const q = question.toLowerCase().trim()

  if (!q) {
    return {
      answer:
        "Ask me about your data, for example:\n- \"How many partially resolved profiles do we have?\"\n- \"How many fully vs not resolved profiles?\"\n- \"Show status for profile with email ...\"",
    }
  }

  // 0) Try LLM router if API key is configured
  let plan: QueryPlan | null = null
  try {
    plan = await getPlanFromLLM(question)
  } catch {
    // ignore, we'll fall back to heuristics
  }

  if (plan) {
    switch (plan.intent) {
      case 'global_status_breakdown': {
        const answer = await handleGlobalStatus()
        return { answer }
      }
      case 'status_for_email': {
        const regex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
        const emailFromPlan = plan.filters?.email
        const emailFromText = question.match(regex)?.[0]
        const email = (emailFromPlan || emailFromText || '').toLowerCase()
        if (email) {
          const answer = await handleStatusForEmail(email)
          return { answer }
        }
        break
      }
    }
  }

  const supabase = createClient()

  // 1) Global status counts (fallback heuristics)
  if (q.includes('how many') || q.includes('combien') || q.includes('stats')) {
    const answer = await handleGlobalStatus()
    return { answer }
  }

  // 2) Profile by email
  const emailMatch = question.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  if (emailMatch) {
    const email = emailMatch[0].toLowerCase()
    const answer = await handleStatusForEmail(email)
    return { answer }
  }

  return {
    answer:
      "I didn't understand this request yet.\nFor now I support questions like:\n- \"How many fully / partially / not resolved profiles do we have?\"\n- \"Give me the status for profile with email margaux@example.com\"",
  }
}


