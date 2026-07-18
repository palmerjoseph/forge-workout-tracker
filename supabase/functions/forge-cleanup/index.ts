// FORGE retention cleanup — nightly via pg_cron.
// Policy: raw per-set rows older than 60 days are deleted. Everything
// that matters long-term is already rolled up permanently:
//   forge_exercise_stats (per-exercise aggregates), forge_prs,
//   forge_workouts (dates/status → calendar & adherence), forge_reports.
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.headers.get('x-forge-secret') !== Deno.env.get('FORGE_CRON_SECRET')) {
    return new Response('forbidden', { status: 403 })
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString()
  const { error, count } = await db
    .from('forge_sets')
    .delete({ count: 'exact' })
    .lt('logged_at', cutoff)
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })

  // Abandoned in-progress workouts older than 2 days → remove.
  // finished_at must be null: a finished workout reopened for editing keeps
  // its finished_at and must never be swept.
  const staleCutoff = new Date(Date.now() - 2 * 86400000).toISOString()
  await db.from('forge_workouts').delete().eq('status', 'in-progress').is('finished_at', null).lt('started_at', staleCutoff)

  return Response.json({ ok: true, deletedSets: count })
})
