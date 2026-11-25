'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import { Wordmark } from '../components/Logo'
import { Sk } from '../components/Skeleton'
import { startDemo } from '../lib/demo'
import ThemeToggle from '../components/ThemeToggle'
import { Screen, Panel } from '../components/Manga'

const OFFLINE = "Can't reach the Gyokan servers right now. Try again in a moment."
// supabase reports network failures as a retryable fetch error with status 0
const isOffline = (error) => error?.name === 'AuthRetryableFetchError' || error?.status === 0

export default function LandingPage() {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
      else setChecking(false)
    })
  }, [])

  const toEmail = (u) => `${u.toLowerCase().trim()}@gyokan.gg`

  const handleLogin = async () => {
    if (!username.trim() || !password) return setError('Fill in all fields')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    })
    if (error) { setError(isOffline(error) ? OFFLINE : 'Invalid username or password'); setLoading(false) }
    else router.push('/dashboard')
  }

  const handleSignup = async () => {
    if (!username.trim() || !password) return setError('Fill in all fields')
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) return setError('Username: 3 to 20 letters, numbers or underscores')
    if (password.length < 8) return setError('Password: minimum 8 characters')
    setLoading(true)
    setError('')

    const { data: existing } = await supabase
      .from('users')
      .select('username')
      .eq('username', username.trim())
      .maybeSingle()

    if (existing) { setError('Username already taken'); setLoading(false); return }

    const { data, error } = await supabase.auth.signUp({
      email: toEmail(username),
      password,
      options: { data: { username: username.trim() } },
    })

    // the database trigger creates the profile and rank rows; it rejects a taken or invalid username
    if (error) { setError(isOffline(error) ? OFFLINE : /database error/i.test(error.message) ? 'Username already taken' : error.message); setLoading(false); return }
    if (data.user) router.push('/dashboard')
  }

  if (checking) return (
    <div className="skeleton-wrap mg min-h-screen flex flex-col items-center justify-center px-6" role="status" aria-label="Loading">
      <Sk className="h-12 w-56 mb-4" />
      <Sk className="h-4 w-40 mb-10" />
      <Sk className="h-12 w-full max-w-sm mb-3" />
      <Sk className="h-12 w-full max-w-sm mb-3" />
      <Sk className="h-12 w-full max-w-sm" />
    </div>
  )

  return (
    <Screen width="max-w-md">
      <div className="flex flex-col gap-3 py-4 md:py-8">
        <div className="arrive border-b-4 border-[var(--line)] pb-4 text-center">
          <h1><Wordmark className="mx-auto w-72 max-w-full" /></h1>
          <p className="poster text-xl muted mt-3">Rise. Battle. Become Legend.</p>
        </div>

        <Panel i={1} pageClass="p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }} aria-pressed={tab === t} className="btn text-xl py-3">
                {t === 'login' ? 'Login' : 'Sign up'}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Username"
            aria-label="Username"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="field"
          />
          <input
            type="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleSignup())}
            className="field"
          />
          {tab === 'signup' && <p className="muted text-sm">Username 3 to 20 characters · password at least 8</p>}

          {error && <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--spot-text)' }}>{error}</p>}

          <button
            onClick={tab === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            className="btn-spot text-2xl w-full py-4">
            {loading ? 'Please wait…' : tab === 'login' ? 'Enter the Arena' : 'Join Gyokan Legends'}
          </button>
          <button onClick={startDemo} className="btn text-xl w-full py-3">Try the demo</button>
        </Panel>

        <Panel i={2} className="hov" pageClass="!bg-[#12100e] text-[#f3efe4]">
          <div className="tone absolute -z-10 inset-0" style={{ '--ink': '#f3efe4' }} aria-hidden="true" />
          <button onClick={() => router.push('/games')} className="press w-full p-4 flex items-center justify-between gap-3 text-left">
            <span>
              <span className="poster block text-2xl">Play free anime games</span>
              <span className="block text-sm mt-1.5">Hangman, Imposter and Charades. No account needed.</span>
            </span>
            <Icon name="arrow" size={22} className="hov-icon flex-shrink-0" />
          </button>
        </Panel>

        <ThemeToggle className="mt-3" />
        <p className="label muted text-center mt-3">A Gyokan product</p>
      </div>
    </Screen>
  )
}
