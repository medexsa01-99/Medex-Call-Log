'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Forgot Password — sends a reset link to the email IF it belongs to a real account.
// For security we always show the same "check your email" message, so a stranger
// typing a random (or someone else's) email learns nothing and gets nowhere.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    })
    // Always succeed to the user — never reveal whether the email exists.
    setLoading(false)
    setSent(true)
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
          <h1 className="text-xl font-bold text-text-primary">Reset your password</h1>
          <p className="text-text-tertiary text-[13px] mt-1.5">We&apos;ll email you a reset link</p>
        </div>

        <div className="card p-7 shadow-theme-lg">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center size-11 rounded-full bg-green-500/10">
                <svg className="size-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-[13px] text-text-secondary">
                If <span className="text-text-primary font-medium">{email.trim()}</span> belongs to an account,
                a password reset link is on its way. Check your inbox (and spam folder).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[12px] font-medium text-text-tertiary mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 bg-surface-inset border border-border rounded-lg text-text-primary text-[13px]
                             placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
                             focus:border-transparent focus-glow transition-all"
                  placeholder="agent@medex.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                           text-white text-[13px] font-semibold rounded-lg transition-all mt-1 shadow-theme-sm
                           active:translate-y-px active:shadow-none"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[13px] text-text-tertiary mt-5">
          <Link href="/login" className="hover:text-indigo-400 transition-colors">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
