import { LocalRepo } from './local'
import { SupabaseRepo, supabaseClient } from './supabase'
import type { Repo } from './types'

/** Supabase when env vars exist, localStorage otherwise. */
function makeRepo(): Repo {
  const client = supabaseClient()
  return client ? new SupabaseRepo(client) : new LocalRepo()
}

export const repo: Repo = makeRepo()
export { uid } from './types'
