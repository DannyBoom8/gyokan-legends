'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import { Sk } from '../components/Skeleton'

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
    if (username.trim().length < 3) return setError('Username: minimum 3 characters')
    if (password.length < 5) return setError('Password: minimum 5 characters')
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) return setError('Username: letters, numbers and underscores only')
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

    if (error) { setError(isOffline(error) ? OFFLINE : error.message); setLoading(false); return }

    if (data.user) {
      await supabase.from('users').insert({ id: data.user.id, username: username.trim() })
      await supabase.from('user_ranks').insert({ user_id: data.user.id })
      router.push('/dashboard')
    }
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
          <h1 className="display text-6xl text-amber-500 !tracking-[0.02em]">Gyokan</h1>
          <p className="label text-zinc-500 !tracking-[0.4em] mt-2">Legends</p>
          <p className="text-zinc-500 text-sm mt-4">Rise. Battle. Become Legend.</p>
        </div>

        <div className="flex bg-zinc-900 rounded-2xl p-1 mb-6 enter" style={{ '--i': 2 }}>
          {['login', 'signup'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`label !text-[0.8125rem] flex-1 py-3.5 rounded-xl transition-colors duration-150 ${tab === t ? 'bg-amber-500 text-black' : 'text-zinc-500'}`}>
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
            className="display w-full bg-amber-500 text-black rounded-2xl py-4 text-base !tracking-[0.06em] press disabled:opacity-50 mt-1">
            {loading ? 'Please wait…' : tab === 'login' ? 'Enter the Arena' : 'Join Gyokan Legends'}
          </button>
        </div>

        {tab === 'signup' && (
          <p className="text-zinc-500 text-sm text-center mt-4">
            Username min 3 chars · Password min 5 chars
          </p>
        )}
        <button onClick={() => router.push('/games')}
          className="group press enter w-full mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3.5 flex items-center justify-between text-left"
          style={{ '--i': 4 }}>
          <span>
            <span className="display block text-base">Play free anime games</span>
            <span className="block text-zinc-500 text-sm mt-1">Hangman, Imposter, Charades and more. No account needed.</span>
          </span>
          <Icon name="arrow" size={20} className="text-amber-500 transition-transform duration-200 group-active:translate-x-0.5" />
        </button>
        <p className="label text-zinc-500 text-center mt-10">A Gyokan product</p>
      </div>
    </div>
  )
}