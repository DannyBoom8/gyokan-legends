'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

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
    if (error) { setError('Invalid username or password'); setLoading(false) }
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

    if (error) { setError(error.message); setLoading(false); return }

    if (data.user) {
      await supabase.from('users').insert({ id: data.user.id, username: username.trim() })
      await supabase.from('user_ranks').insert({ user_id: data.user.id })
      router.push('/dashboard')
    }
  }

  if (checking) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-amber-500 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-amber-500 tracking-tight">GYOKAN</h1>
          <p className="text-zinc-500 text-xs tracking-[0.3em] uppercase mt-1">Legends</p>
          <p className="text-zinc-600 text-xs mt-3">Rise. Battle. Become Legend.</p>
        </div>

        <div className="flex bg-zinc-900 rounded-2xl p-1 mb-6">
          {['login', 'signup'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-amber-500 text-black' : 'text-zinc-500'}`}>
              {t === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-4 text-sm outline-none border border-zinc-800 focus:border-amber-500 transition-colors placeholder:text-zinc-600"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleSignup())}
            className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-4 text-sm outline-none border border-zinc-800 focus:border-amber-500 transition-colors placeholder:text-zinc-600"
          />

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            onClick={tab === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            className="w-full bg-amber-500 text-black font-bold rounded-2xl py-4 text-sm transition-all active:scale-95 disabled:opacity-50 mt-1">
            {loading ? 'Please wait...' : tab === 'login' ? 'Enter the Arena' : 'Join Gyokan Legends'}
          </button>
        </div>

        {tab === 'signup' && (
          <p className="text-zinc-700 text-xs text-center mt-4">
            Username min 3 chars · Password min 5 chars
          </p>
        )}
        <p className="text-zinc-800 text-xs text-center mt-10">A Gyokan Product</p>
      </div>
    </div>
  )
}