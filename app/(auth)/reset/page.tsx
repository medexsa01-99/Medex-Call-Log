'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Reset password — the page the email link lands on. The Supabase client picks up
// the recovery token from the URL automatically and creates a temporary session;
// we then let the user set a new password.
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // The recovery link creates a session via detectSessionInUrl. Watch for it,
    // and also check any session that already resolved before this ran.
    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session) { setReady(true); setChecking(false) }
    })
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setReady(true)
      // Give detectSessionInUrl a moment before declaring the link invalid.
      setTimeout(() => setChecking(false), 1500)
    })()
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error: updErr } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updErr) { setError(updErr.message); return }
    setDone(true)
    await supabase.auth.signOut()
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 relative overflow-hidden bg-background" style={{
      backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.12), transparent 70%)',
    }}>
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.015]" style={{
        backgroundImage: 'linear-gradient(var(--text-muted) 1px, transparent 1px), linear-gradient(90deg, var(--text-muted) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }} />

      <div className="w-full max-w-[380px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-11 rounded-xl bg-indigo-500/10 mb-5" style={{
            boxShadow: '0 0 20px -4px rgba(99, 102, 241, 0.2)',
          }}>
            <svg className="size-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary">Set a new password</h1>
        </div>

        <div className="card p-7 shadow-theme-lg">
          {done ? (
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center size-11 rounded-full bg-green-500/10">
                <svg className="size-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-[13px] text-text-secondary">Password updated. Taking you to sign in…</p>
            </div>
          ) : checking ? (
            <p className="text-[13px] text-text-tertiary text-center">Verifying your reset link…</p>
          ) : ready ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/8 border border-red-500/15 rounded-lg px-3.5 py-2.5 text-red-400 text-[13px]">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="password" className="block text-[12px] font-medium text-text-tertiary mb-1.5">New password</label>
                <input
                  id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="new-password" placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-surface-inset border border-border rounded-lg text-text-primary text-[13px]
                             placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
                             focus:border-transparent focus-glow transition-all"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-[12px] font-medium text-text-tertiary mb-1.5">Confirm new password</label>
                <input
                  id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  required autoComplete="new-password" placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-surface-inset border border-border rounded-lg text-text-primary text-[13px]
                             placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
                             focus:border-transparent focus-glow transition-all"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                           text-white text-[13px] font-semibold rounded-lg transition-all mt-1 shadow-theme-sm
                           active:translate-y-px active:shadow-none"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-[13px] text-text-secondary">
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <Link href="/forgot" className="inline-block text-[13px] text-indigo-400 hover:text-indigo-300 transition-colors">
                Request a new link
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-[13px] text-text-tertiary mt-5">
          <Link href="/login" className="hover:text-indigo-400 transition-colors">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
