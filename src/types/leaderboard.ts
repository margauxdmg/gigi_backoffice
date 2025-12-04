export type LeaderboardEntry = {
  name: string
  actions: number
  last_active: string
}

export type ActionLog = {
  id: string
  user_name: string
  action_type: string // 'triage_fix', 'manual_edit', 'skip'
  details?: string
  created_at: string
}

