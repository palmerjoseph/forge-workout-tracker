// FORGE report engine — runs on Supabase Edge Functions (Deno).
// Invoked daily by pg_cron (16:00 & 17:00 UTC). Fires only when it's
// 9 AM in America/Los_Angeles AND today is Sunday (weekly) or the 1st
// (monthly). Milestone reports (6-month, yearly) piggyback on the
// monthly run. Deduped by the unique (kind, period_start) constraint.
//
// Secrets (supabase secrets set):
//   FORGE_CRON_SECRET   — shared secret; must match the cron caller
//   TELEGRAM_BOT_TOKEN  — from @BotFather
//   TELEGRAM_CHAT_ID    — Palmer's chat id
//   RESEND_API_KEY      — resend.com
//   REPORT_EMAIL        — palmerjosephai@gmail.com
import { createClient } from 'npm:@supabase/supabase-js@2'

const TZ = 'America/Los_Angeles'

type Workout = { date: string; day_type: string; status: string; duration_sec: number | null }
type Stat = { workout_date: string; exercise_id: string; total_volume_lbs: number; total_sets: number; est_1rm: number; top_weight_lbs: number; top_reps: number }
type Pr = { exercise_id: string; date: string; weight_lbs: number; reps: number }

Deno.serve(async (req) => {
  if (req.headers.get('x-forge-secret') !== Deno.env.get('FORGE_CRON_SECRET')) {
    return new Response('forbidden', { status: 403 })
  }
  const force = new URL(req.url).searchParams.get('force') // 'weekly' | 'monthly' for testing

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const now = new Date()
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(now)
  const get = (t: string) => local.find((p) => p.type === t)?.value ?? ''
  const hour = parseInt(get('hour'))
  const weekday = get('weekday') // 'Sun'
  const todayLocal = `${get('year')}-${get('month')}-${get('day')}`

  const ran: string[] = []
  const is9am = hour === 9

  if (force === 'weekly' || (is9am && weekday === 'Sun')) {
    await weeklyReport(db, todayLocal).then((r) => ran.push(r))
  }
  if (force === 'monthly' || (is9am && todayLocal.endsWith('-01'))) {
    await monthlyReport(db, todayLocal).then((r) => ran.push(r))
    await milestoneReports(db, todayLocal).then((r) => ran.push(...r))
  }
  return Response.json({ ok: true, ran, todayLocal, hour, weekday })
})

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function fetchRange(db: ReturnType<typeof createClient>, start: string, end: string) {
  const [{ data: workouts }, { data: stats }, { data: prs }] = await Promise.all([
    db.from('forge_workouts').select('date, day_type, status, duration_sec').gte('date', start).lte('date', end),
    db.from('forge_exercise_stats').select('workout_date, exercise_id, total_volume_lbs, total_sets, est_1rm, top_weight_lbs, top_reps').gte('workout_date', start).lte('workout_date', end),
    db.from('forge_prs').select('exercise_id, date, weight_lbs, reps').gte('date', start).lte('date', end),
  ])
  return { workouts: (workouts ?? []) as Workout[], stats: (stats ?? []) as Stat[], prs: (prs ?? []) as Pr[] }
}

function summarize(workouts: Workout[], stats: Stat[]) {
  const done = workouts.filter((w) => w.status === 'completed').length
  const partial = workouts.filter((w) => w.status === 'partial').length
  const volume = stats.reduce((s, x) => s + Number(x.total_volume_lbs), 0)
  const sets = stats.reduce((s, x) => s + x.total_sets, 0)
  const minutes = Math.round(workouts.reduce((s, w) => s + (w.duration_sec ?? 0), 0) / 60)
  return { done, partial, sessions: done + partial, volume: Math.round(volume), sets, minutes }
}

/** Firm-trainer verdict — same tone contract as the in-app coach. */
function verdict(name: string, cur: ReturnType<typeof summarize>, prev: ReturnType<typeof summarize>, prCount: number, period: string): string {
  const trend = prev.volume > 0 ? Math.round(((cur.volume - prev.volume) / prev.volume) * 100) : 0
  if (cur.sessions === 0) {
    return `Zero sessions this ${period}, ${name}. No spin on that — the program only works if you show up. This ${period} is gone; the next one isn't.`
  }
  if (cur.sessions <= 2 && period === 'week') {
    return `${cur.sessions} session${cur.sessions === 1 ? '' : 's'} this week. Below the standard you set. Busy weeks happen — two in a row is a pattern. Get ahead of it.`
  }
  if (trend < -15 && prev.sessions > 0) {
    return `You showed up (${cur.sessions} sessions) but volume dropped ${Math.abs(trend)}% vs last ${period}. Showing up is half the job — the other half is the bar. Nudge the weights back up.`
  }
  if (prCount > 0 && trend >= 0) {
    return `${cur.sessions} sessions, ${prCount} PR${prCount > 1 ? 's' : ''}, volume ${trend >= 5 ? `up ${trend}%` : 'holding'}. That's a genuinely strong ${period}, ${name}. Protect the recovery and keep stacking.`
  }
  if (trend >= 5) {
    return `${cur.sessions} sessions and volume up ${trend}%. Quiet, steady progress — exactly what works at 42. Stay boring.`
  }
  return `${cur.sessions} sessions, volume steady. Solid, repeatable work. When it starts feeling easy, that's your cue — not your reward.`
}

function reportHtml(title: string, periodLabel: string, cur: ReturnType<typeof summarize>, prev: ReturnType<typeof summarize>, prs: Pr[], exNames: Map<string, string>, verdictText: string): string {
  const trend = prev.volume > 0 ? Math.round(((cur.volume - prev.volume) / prev.volume) * 100) : null
  const stat = (label: string, value: string) =>
    `<td style="padding:14px 10px;text-align:center;background:#0F150F;border-radius:12px;">
       <div style="font-size:26px;font-weight:700;color:#F1F5EC;font-family:Arial Narrow,Arial,sans-serif;">${value}</div>
       <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#93A08D;margin-top:4px;">${label}</div>
     </td>`
  const prRows = prs.length
    ? prs.map((p) => `<tr><td style="padding:6px 0;color:#F1F5EC;font-size:14px;">🏆 ${exNames.get(p.exercise_id) ?? p.exercise_id}</td><td style="padding:6px 0;text-align:right;color:#FFD66B;font-size:14px;font-weight:700;">${p.weight_lbs > 0 ? `${p.weight_lbs} lb × ${p.reps}` : `${p.reps} reps`}</td></tr>`).join('')
    : '<tr><td style="padding:6px 0;color:#566050;font-size:13px;">No new records this period.</td></tr>'
  return `
  <div style="background:#050705;padding:28px 18px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;">
      <div style="font-size:11px;letter-spacing:3px;color:#A8E063;text-transform:uppercase;">FORGE · ${periodLabel}</div>
      <h1 style="color:#F1F5EC;font-size:30px;margin:8px 0 20px;font-family:Arial Narrow,Arial,sans-serif;text-transform:uppercase;">${title}</h1>
      <table role="presentation" width="100%" cellspacing="6" cellpadding="0"><tr>
        ${stat('Sessions', String(cur.sessions))}
        ${stat('Volume lb', cur.volume.toLocaleString())}
        ${stat('Sets', String(cur.sets))}
        ${stat('Minutes', String(cur.minutes))}
      </tr></table>
      ${trend !== null ? `<p style="color:${trend >= 0 ? '#A8E063' : '#E0745C'};font-size:14px;margin:14px 0 0;">Volume ${trend >= 0 ? '▲ up' : '▼ down'} ${Math.abs(trend)}% vs previous period</p>` : ''}
      <div style="background:#0F150F;border-left:3px solid #A8E063;border-radius:0 12px 12px 0;padding:16px;margin:22px 0;">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#93A08D;margin-bottom:8px;">Coach's verdict</div>
        <p style="color:#F1F5EC;font-size:15px;line-height:1.55;margin:0;">${verdictText}</p>
      </div>
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#93A08D;margin-bottom:6px;">Records</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${prRows}</table>
      <p style="color:#566050;font-size:11px;margin-top:28px;">FORGE — generated automatically. Full history in the app.</p>
    </div>
  </div>`
}

async function persistAndSend(db: ReturnType<typeof createClient>, kind: string, periodStart: string, periodEnd: string, title: string, headline: string, html: string, telegramText: string) {
  // unique (kind, period_start) makes this idempotent across the two cron hours.
  // 23505 = that duplicate (the other cron hour already sent it) — expected.
  // Any OTHER error is a real failure: surface it instead of silently skipping
  // delivery and pretending the report was sent.
  const { error } = await db.from('forge_reports').insert({ kind, period_start: periodStart, period_end: periodEnd, title, headline, html })
  if (error) {
    if (error.code === '23505') return `${kind}: already sent (${error.code})`
    return `${kind}: NOT sent — db error ${error.code ?? '?'}: ${error.message}`
  }

  const delivery: string[] = []
  const tg = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chat = Deno.env.get('TELEGRAM_CHAT_ID')
  if (tg && chat) {
    const r = await fetch(`https://api.telegram.org/bot${tg}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: telegramText }),
    })
    delivery.push(r.ok ? 'tg:ok' : `tg:FAIL ${r.status} ${(await r.text()).slice(0, 120)}`)
  } else delivery.push('tg:unconfigured')
  const resend = Deno.env.get('RESEND_API_KEY')
  const to = Deno.env.get('REPORT_EMAIL')
  if (resend && to) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${resend}` },
      body: JSON.stringify({ from: 'FORGE <onboarding@resend.dev>', to: [to], subject: title, html }),
    })
    delivery.push(r.ok ? 'email:ok' : `email:FAIL ${r.status} ${(await r.text()).slice(0, 120)}`)
  } else delivery.push('email:unconfigured')
  return `${kind}: sent (${delivery.join(', ')})`
}

async function weeklyReport(db: ReturnType<typeof createClient>, todayLocal: string): Promise<string> {
  const end = addDays(todayLocal, -1) // Saturday
  const start = addDays(todayLocal, -7) // previous Sunday
  const prevEnd = addDays(start, -1)
  const prevStart = addDays(start, -7)
  const cur = await fetchRange(db, start, end)
  const prev = await fetchRange(db, prevStart, prevEnd)
  const curS = summarize(cur.workouts, cur.stats)
  const prevS = summarize(prev.workouts, prev.stats)
  const { data: exs } = await db.from('forge_exercises').select('id, name')
  const exNames = new Map((exs ?? []).map((e: { id: string; name: string }) => [e.id, e.name]))
  const v = verdict('Palmer', curS, prevS, cur.prs.length, 'week')
  const title = `Weekly Report — ${start} to ${end}`
  const html = reportHtml(title, 'Weekly report', curS, prevS, cur.prs, exNames, v)
  const tgText = `📊 FORGE weekly report is in your inbox.\n${curS.sessions} sessions · ${curS.volume.toLocaleString()} lb moved · ${cur.prs.length} PR${cur.prs.length === 1 ? '' : 's'}.\n${v}`
  return persistAndSend(db, 'weekly', start, end, title, v, html, tgText)
}

async function monthlyReport(db: ReturnType<typeof createClient>, todayLocal: string): Promise<string> {
  const monthEnd = addDays(todayLocal, -1)
  const monthStart = monthEnd.slice(0, 8) + '01'
  const prevMonthEnd = addDays(monthStart, -1)
  const prevMonthStart = prevMonthEnd.slice(0, 8) + '01'
  const cur = await fetchRange(db, monthStart, monthEnd)
  const prev = await fetchRange(db, prevMonthStart, prevMonthEnd)
  const curS = summarize(cur.workouts, cur.stats)
  const prevS = summarize(prev.workouts, prev.stats)
  const { data: exs } = await db.from('forge_exercises').select('id, name')
  const exNames = new Map((exs ?? []).map((e: { id: string; name: string }) => [e.id, e.name]))
  const monthName = new Date(monthStart + 'T12:00:00Z').toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const v = verdict('Palmer', curS, prevS, cur.prs.length, 'month')
  const title = `Monthly Report — ${monthName}`
  const html = reportHtml(title, 'Monthly report', curS, prevS, cur.prs, exNames, v)
  const tgText = `📈 FORGE monthly report (${monthName}) is in your inbox.\n${curS.sessions} sessions · ${curS.volume.toLocaleString()} lb · ${cur.prs.length} PRs.\n${v}`
  return persistAndSend(db, 'monthly', monthStart, monthEnd, title, v, html, tgText)
}

/** 6-month / yearly reviews once enough history exists (recurring). */
async function milestoneReports(db: ReturnType<typeof createClient>, todayLocal: string): Promise<string[]> {
  const out: string[] = []
  const { data: first } = await db.from('forge_workouts').select('date').order('date').limit(1)
  if (!first?.length) return out
  const firstDate = (first[0] as { date: string }).date
  const daysOfData = Math.floor((Date.parse(todayLocal) - Date.parse(firstDate)) / 86400000)

  for (const [kind, span] of [['six-month', 182], ['yearly', 365]] as const) {
    if (daysOfData < span) continue
    // fire only if the last one of this kind is at least `span` days old
    const { data: last } = await db.from('forge_reports').select('period_end').eq('kind', kind).order('period_end', { ascending: false }).limit(1)
    const lastEnd = last?.length ? (last[0] as { period_end: string }).period_end : null
    if (lastEnd && Math.floor((Date.parse(todayLocal) - Date.parse(lastEnd)) / 86400000) < span) continue

    const end = addDays(todayLocal, -1)
    const start = addDays(todayLocal, -span)
    const cur = await fetchRange(db, start, end)
    const prev = await fetchRange(db, addDays(start, -span), addDays(start, -1))
    const curS = summarize(cur.workouts, cur.stats)
    const prevS = summarize(prev.workouts, prev.stats)
    const { data: exs } = await db.from('forge_exercises').select('id, name')
    const exNames = new Map((exs ?? []).map((e: { id: string; name: string }) => [e.id, e.name]))
    const label = kind === 'six-month' ? '6-Month Review' : 'Yearly Review'
    const v = verdict('Palmer', curS, prevS, cur.prs.length, kind === 'six-month' ? '6 months' : 'year')
    const html = reportHtml(label, label, curS, prevS, cur.prs, exNames, v)
    const tgText = `🎯 FORGE ${label.toLowerCase()} is in your inbox.\n${curS.sessions} sessions · ${curS.volume.toLocaleString()} lb over the period.\n${v}`
    out.push(await persistAndSend(db, kind, start, end, label, v, html, tgText))
  }
  return out
}
