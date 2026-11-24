'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import { Wordmark } from '../components/Logo'
import { Sk } from '../components/Skeleton'
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
    if (data.user) router.push('/dashboard')
  }

  if (checking) return (
    <div className="skeleton-wrap min-h-screen bg-black flex flex-col items-center justify-center px-6" role="status" aria-label="Loading">
      <Sk className="h-12 w-56 mb-4" />
      <Sk className="h-4 w-40 mb-10" />
      <Sk className="h-12 w-full max-w-sm mb-3" />
      <Sk className="h-12 w-full max-w-sm mb-3" />
      <Sk className="h-12 w-full max-w-sm" />
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10 enter">
          <h1><Wordmark className="mx-auto w-72 max-w-full text-white" /></h1>
          <p className="text-zinc-500 text-sm mt-4">Rise. Battle. Become Legend.</p>
        </div>

        <div className="flex bg-zinc-900 rounded-2xl p-1 mb-6 enter" style={{ '--i': 2 }}>
          {['login', 'signup'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`label !text-[0.8125rem] flex-1 py-3.5 rounded-xl transition-colors duration-150 ${tab === t ? 'bg-amber-500 text-on-accent' : 'text-zinc-500'}`}>
              {t === 'login' ? 'Login' : 'Sign up'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 enter" style={{ '--i': 3 }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-4 text-base sm:text-sm outline-none border border-zinc-800 focus:border-amber-500 transition-colors placeholder:text-zinc-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleSignup())}
            className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-4 text-base sm:text-sm outline-none border border-zinc-800 focus:border-amber-500 transition-colors placeholder:text-zinc-500"
          />

          {error && <p role="alert" className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={tab === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            className="display w-full bg-amber-500 text-on-accent rounded-2xl py-4 text-base !tracking-[0.06em] press disabled:opacity-50 mt-1">
            {loading ? 'Please wait…' : tab === 'login' ? 'Enter the Arena' : 'Join Gyokan Legends'}
          </button>
        </div>

        {tab === 'signup' && (
          <p className="text-zinc-500 text-sm text-center mt-4">
            Username 3 to 20 chars · Password min 8 chars
          </p>
        )}
        <button onClick={startDemo}
          className="label press enter w-full mt-4 rounded-2xl border border-amber-500/40 text-amber-500 py-3.5 !text-[0.8125rem]"
          style={{ '--i': 4 }}>
          Try the demo
        </button>
        <button onClick={() => router.push('/games')}
          className="group press enter w-full mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3.5 flex items-center justify-between text-left"
          style={{ '--i': 5 }}>
          <span>
            <span className="display block text-base">Play free anime games</span>
            <span className="block text-zinc-500 text-sm mt-1">Hangman, Imposter, Charades and more. No account needed.</span>
          </span>
          <Icon name="arrow" size={20} className="text-amber-500 transition-transform duration-200 group-active:translate-x-0.5" />
        </button>
        <ThemeToggle className="mt-8" />
        <p className="label text-zinc-500 text-center mt-8">A Gyokan product</p>
      </div>
    </div>
  )
}