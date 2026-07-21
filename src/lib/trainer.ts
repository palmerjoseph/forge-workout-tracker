/* The trainer voice — firm, honest, respects that the athlete is busy.
   Addresses the lifter by their settings name ({name}); no identity is
   hardcoded. Rule-based tiers keyed off adherence and trend. No LLM, no cost.
   Tone contract: direct sentences, no exclamation spam, no empty hype,
   call out slacking plainly, give credit only when earned. */

export type Tier = 'slacking' | 'behind' | 'steady' | 'strong' | 'crushing'

export function tierFor(adherencePct: number, volumeTrendPct: number): Tier {
  if (adherencePct < 40) return 'slacking'
  if (adherencePct < 70) return 'behind'
  if (adherencePct < 90) return volumeTrendPct < -10 ? 'behind' : 'steady'
  return volumeTrendPct > 5 ? 'crushing' : 'strong'
}

const BANKS: Record<Tier, string[]> = {
  slacking: [
    "{name}, let's be honest — this week got away from you. {done} of {planned} sessions. You know the fix: show up today.",
    "{done} of {planned}. That's not a program, that's a coincidence. One workout today turns this around.",
    'The calendar doesn\'t lie: {done} of {planned}. You\'re better than this week suggests. Prove it today.',
  ],
  behind: [
    "You're at {done} of {planned} — under where you want to be. Busy is real, but so is the barbell. Get today's session in.",
    '{done} of {planned} sessions. Not a disaster, not good enough either. Close the gap.',
    "Half-committed weeks produce half results. {done} of {planned}. Today's workout is the one that matters.",
  ],
  steady: [
    "{done} of {planned} — solid, consistent work. Consistency is what builds real strength. Keep the chain going.",
    "You're showing up: {done} of {planned}. Now nudge the weights. Same effort, slightly heavier.",
    'Good rhythm this week — {done} of {planned}. Boring consistency beats heroic bursts. Stay boring.',
  ],
  strong: [
    '{done} of {planned}. That\'s a full week of honest work. This is what progress is built from.',
    'Every planned session, done. No notes. Protect this streak like it\'s your job.',
    "{done} of {planned} and the volume's holding. You've earned the next challenge unlock — consider it.",
  ],
  crushing: [
    '{done} of {planned} with volume climbing {trend}%. This is the best stretch you\'ve had. Do not overreach — recover as hard as you train.',
    'Full attendance, rising volume. Textbook. The only threat now is doing too much — keep sessions at 45 and sleep.',
    "Volume up {trend}%, all sessions in. That's real, measurable progress, {name}. Log it and stay hungry.",
  ],
}

const REST_DAY_LINES = [
  'Rest day. Growth happens now, not in the gym. Eat, walk, sleep.',
  "Planned rest — take it seriously. Recovery is training you can't skip.",
  'Off day. If you feel guilty, take a walk. The barbell will be there tomorrow.',
]

const FIRST_TIME_LINES = [
  "Day one, {name}. No history to judge — yet. The only bad workout is the one that doesn't happen.",
  'Clean slate. Every number you log from here on is a baseline to beat.',
  'Welcome to the program. Start today and give me something to hold you to.',
]

/** Deterministic per-day pick so the message doesn't change on refresh. */
export function trainerMessage(opts: {
  tier: Tier
  done: number
  planned: number
  trendPct: number
  dateSeed: string
  name?: string
  isRestDay?: boolean
  isFirstTime?: boolean
}): string {
  const line = opts.isFirstTime
    ? pick(FIRST_TIME_LINES, opts.dateSeed)
    : opts.isRestDay
      ? pick(REST_DAY_LINES, opts.dateSeed)
      : pick(BANKS[opts.tier], opts.dateSeed)
  return line
    .replace(/\{name\}/g, opts.name?.trim() || 'there')
    .replace(/\{done\}/g, String(opts.done))
    .replace(/\{planned\}/g, String(opts.planned))
    .replace(/\{trend\}/g, String(Math.abs(Math.round(opts.trendPct))))
}

function pick(arr: string[], seed: string): string {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return arr[h % arr.length]
}

/** Factual context line prepended to the verdict — built from real history
 *  so the coach visibly "knows" what happened. Deterministic, no LLM. */
export function trainerContext(opts: {
  lastSession?: { name: string; daysAgo: number; volume: number; prCount: number }
  isMonday?: boolean
  lastWeek?: { sessions: number; volume: number }
}): string {
  const parts: string[] = []
  if (opts.lastSession) {
    const { name, daysAgo, volume, prCount } = opts.lastSession
    const when = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`
    parts.push(
      `${when}: ${name}, ${volume >= 1000 ? `${Math.round(volume / 100) / 10}k` : volume} lb${prCount > 0 ? `, ${prCount} PR${prCount > 1 ? 's' : ''}` : ''}.`,
    )
  }
  if (opts.isMonday && opts.lastWeek && opts.lastWeek.sessions > 0) {
    parts.push(`Last week: ${opts.lastWeek.sessions} sessions, ${Math.round(opts.lastWeek.volume / 1000)}k lb.`)
  }
  return parts.join(' ')
}
