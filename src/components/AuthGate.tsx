import { useEffect, useState, type ReactNode } from 'react'
import { GlowButton } from './ui'
import { repo } from '../lib/repo'
import { supabaseClient } from '../lib/repo/supabase'

const LAST_SEEN_KEY = 'forge.lastSeen'
const SESSION_DAYS = 3

/** Rolling session window: if the app hasn't been opened in SESSION_DAYS,
 *  force a fresh login. Returns true when the session should be dropped. */
function sessionExpired(): boolean {
  const last = Number(localStorage.getItem(LAST_SEEN_KEY) || 0)
  return last > 0 && Date.now() - last > SESSION_DAYS * 86400000
}

function touchSession() {
  localStorage.setItem(LAST_SEEN_KEY, String(Date.now()))
}

/** Blocks the app behind Supabase email/password login when Supabase is
 *  configured. In local (no-env) mode it renders children directly.
 *  Also handles the password-recovery redirect (#type=recovery). */
export function AuthGate({ children }: { children: ReactNode }) {
  const client = supabaseClient()
  const [status, setStatus] = useState<'loading' | 'authed' | 'anon' | 'recovery'>(client ? 'loading' : 'authed')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!client) return
    // RLS blocks reads/seeding until a session exists, so first-run
    // seeding must happen AFTER auth — never at module load.
    const enter = async (hasSession: boolean) => {
      if (!hasSession) return setStatus('anon')
      if (sessionExpired()) {
        await client.auth.signOut()
        localStorage.removeItem(LAST_SEEN_KEY)
        setNotice('Been a few days — log in again to continue.')
        return setStatus('anon')
      }
      touchSession()
      try {
        await repo.ready()
      } catch (e) {
        console.error('seed check failed', e)
      }
      setStatus('authed')
    }
    client.auth.getSession().then(({ data }) => enter(!!data.session))
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('recovery')
      else if (session) enter(true)
      else setStatus('anon')
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'authed') return children
  if (status === 'loading') return <div className="min-h-dvh bg-bg0" />

  const login = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    const { error } = await client!.auth.signInWithPassword({ email, password })
    if (error) setError('Wrong email or password. Try again.')
    else touchSession()
    setBusy(false)
  }

  const forgot = async () => {
    if (!email) return setError('Enter your email above first, then tap Forgot password.')
    setBusy(true)
    setError('')
    const { error } = await client!.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setBusy(false)
    if (error) {
      // Surface the real reason — Supabase's built-in mailer allows only
      // ~2 auth emails/hour, and "rate limit" is the usual culprit.
      setError(
        /rate limit/i.test(error.message)
          ? 'Email limit reached (Supabase allows 2/hour). Wait an hour and try once.'
          : `Could not send the reset email: ${error.message}`,
      )
    } else setNotice('Reset link sent — check your email (and spam), open it on this device.')
  }

  const setNewPassword = async () => {
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== password2) return setError("Passwords don't match.")
    setBusy(true)
    setError('')
    const { error } = await client!.auth.updateUser({ password })
    setBusy(false)
    if (error) setError('Could not update the password. The link may have expired — request a new one.')
    else {
      touchSession()
      setPassword('')
      setPassword2('')
      setStatus('authed')
    }
  }

  const input = 'w-full bg-glass border border-edge rounded-xl px-4 py-3.5 text-ink placeholder:text-ink-faint focus:border-edge-hi outline-none'

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 relative">
      <div className="glow-orb -top-[20vmin] -right-[20vmin]" />
      <div className="w-full max-w-85 relative z-10">
        <p className="eyebrow">{status === 'recovery' ? 'Set a new password' : 'Members only'}</p>
        <h1 className="display text-5xl mt-1 mb-6">
          FOR<span className="text-lime" style={{ textShadow: '0 0 20px rgba(168,224,99,0.5)' }}>GE</span>
        </h1>
        {status === 'recovery' ? (
          <div className="flex flex-col gap-3">
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              aria-label="New password"
              className={input}
            />
            <input
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setNewPassword()}
              placeholder="Repeat new password"
              aria-label="Repeat new password"
              className={input}
            />
            {error && <p className="text-sm text-ember">{error}</p>}
            <GlowButton onClick={setNewPassword} disabled={busy || !password || !password2}>
              {busy ? 'Saving…' : 'Save new password'}
            </GlowButton>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
              className={input}
            />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              placeholder="Password"
              aria-label="Password"
              className={input}
            />
            {error && <p className="text-sm text-ember">{error}</p>}
            {notice && <p className="text-sm text-lime">{notice}</p>}
            <GlowButton onClick={login} disabled={busy || !email || !password}>
              {busy ? 'Checking…' : 'Enter'}
            </GlowButton>
            <button
              onClick={forgot}
              disabled={busy}
              className="text-sm text-ink-dim hover:text-lime transition-colors cursor-pointer self-center py-1"
            >
              Forgot password?
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
