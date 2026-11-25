'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import FaceWall from '../components/FaceWall'
import { Wordmark } from '../components/Logo'
import Splash from '../components/Splash'
import { startDemo } from '../lib/demo'
import ThemeToggle from '../components/ThemeToggle'

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
    if (data.user) router.push('/squad') // a new player answers the starting questions first
  }

  if (checking) return <Splash hold />

  return (
    <main className="mg login relative h-dvh overflow-hidden">
      <FaceWall />
      {/* only the card takes the pointer, so every face around it can still be hovered */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3">
        <div className="arrive login-card box pointer-events-auto w-full max-w-sm max-h-full overflow-y-auto flex flex-col">
          <h1><Wordmark className="login-logo mx-auto" /></h1>

          <div className="grid grid-cols-2 gap-2">
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }} aria-pressed={tab === t} className="btn text-lg">
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
          {tab === 'signup' && <p className="muted text-xs">Username 3 to 20 characters · password at least 8</p>}

          {error && <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--spot-text)' }}>{error}</p>}

          <button
            onClick={tab === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            className="btn-spot text-xl w-full">
            {loading ? 'Please wait…' : tab === 'login' ? 'Enter the Arena' : 'Join Gyokan Legends'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={startDemo} className="btn text-lg">Try the demo</button>
            <button onClick={() => router.push('/games')} className="btn text-lg">Free games</button>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </main>
  )
}
