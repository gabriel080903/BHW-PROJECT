import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'
import { api } from '../utils/api'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4"/>
      <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853"/>
      <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03298C-0.371021 20.0112 -0.371021 28.0009 3.03298 34.7825L11.0051 28.6006Z" fill="#FBBC04"/>
      <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4414 -0.068932 24.48 0.00161733C15.4055 0.00161733 7.10718 5.11644 3.03296 13.2296L11.005 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335"/>
    </svg>
  )
}

// Pending approval screen shown after Google sign-in for new users
function PendingApprovalScreen({ email, displayName, onBack }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-amber-400/20 border-2 border-amber-400/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⏳</span>
        </div>
        <h2 className="text-white font-black text-xl mb-2">Waiting for Approval</h2>
        <p className="text-emerald-300 text-sm mb-4">
          Your account <span className="font-bold text-white">{email}</span> has been registered and is pending admin approval.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">What happens next?</p>
          <p className="text-white/70 text-xs">1. The BHW Admin will review your account</p>
          <p className="text-white/70 text-xs">2. You will be assigned a role (BHW Staff or Parent)</p>
          <p className="text-white/70 text-xs">3. Once approved, you can sign in with Google</p>
        </div>
        <p className="text-white/40 text-xs mb-4">Contact your barangay health worker if you need faster access.</p>
        <button onClick={onBack}
          className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-all border border-white/20">
          ← Back to Sign In
        </button>
      </motion.div>
    </div>
  )
}

export default function Login({ onLogin }) {
  const [form,    setForm]    = useState({ username: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(null) // { email, displayName }

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const hasGoogleAuth = !!GOOGLE_CLIENT_ID

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      setError('')
      try {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const profile = await profileRes.json()

        try {
          const data = await api.post('/api/auth/google-token', {
            accessToken: tokenResponse.access_token,
            profile: { sub: profile.sub, email: profile.email, name: profile.name, picture: profile.picture }
          })

          if (data.user) {
            onLogin(data.user)
            return
          }
        } catch (err) {
          const msg = err.message || ''
          // Check if pending approval
          if (msg === 'pending_approval') {
            setPendingApproval({ email: profile.email, displayName: profile.name })
            return
          }
          if (msg === 'account_deactivated') {
            setError('Your account has been deactivated. Contact the admin.')
            return
          }
          // Network error — don't auto-redirect to pending
          if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
            setError('Cannot connect to server. Please try again.')
            return
          }
          // Unknown error from backend — show it
          setError(msg || 'Google sign-in failed. Please try again.')
          return
        }
      } catch {
        setError('Google sign-in failed. Please try again.')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled or failed.')
      setGoogleLoading(false)
    },
  })

  const handleChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter both username and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.post('/api/auth/login', {
        username: form.username.trim().toLowerCase(),
        password: form.password,
      })

      let role = data.user?.role || 'BHW'
      if (data.token && !data.user?.role) {
        try {
          const payload = JSON.parse(atob(data.token.split('.')[1]))
          role = payload.role || 'BHW'
        } catch { /* use default */ }
      }

      const session = {
        id:          data.user?.id || data.id,
        username:    data.user?.username || form.username.trim().toLowerCase(),
        displayName: data.user?.displayName || data.user?.username || form.username.trim(),
        role,
        email:       data.user?.email || '',
        loginAt:     new Date().toISOString(),
      }
      localStorage.setItem('bhw_user', JSON.stringify(session))
      onLogin(session)
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  // Show pending approval screen
  if (pendingApproval) {
    return <PendingApprovalScreen email={pendingApproval.email} displayName={pendingApproval.displayName} onBack={() => setPendingApproval(null)} />
  }

  const isAnyLoading = loading || googleLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-400 rounded-2xl shadow-lg shadow-emerald-900/50 mb-4">
            <svg className="w-9 h-9 text-emerald-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">BHW Nutrition Tracker</h1>
          <p className="text-emerald-400 text-sm font-medium mt-1">Barangay Health System · v2.0</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-white font-bold text-lg mb-6">Sign in to continue</h2>

          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-4 py-3 bg-red-500/20 border border-red-400/30 rounded-xl text-sm text-red-300 font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </motion.div>
          )}

          {hasGoogleAuth && (
            <>
              <motion.button type="button" onClick={() => { setError(''); googleLogin() }}
                disabled={isAnyLoading} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl text-sm shadow-md transition-all disabled:opacity-60 mb-4">
                {googleLoading
                  ? <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <GoogleIcon />}
                {googleLoading ? 'Connecting…' : 'Continue with Google'}
              </motion.button>
              <p className="text-white/30 text-xs text-center mb-4">New Google users require admin approval</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label className="block text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">Username</label>
              <input type="text" name="username" value={form.username} onChange={handleChange}
                autoComplete="username" placeholder="Enter username" disabled={isAnyLoading}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all disabled:opacity-50"/>
            </div>
            <div className="mb-6">
              <label className="block text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                  autoComplete="current-password" placeholder="Enter password" disabled={isAnyLoading}
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all disabled:opacity-50"/>
                <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors text-base">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isAnyLoading}
              className="w-full bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold py-3.5 rounded-xl text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
              {loading
                ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Signing in…</>
                : '🔐 Sign In'}
            </button>
          </form>
        </div>
        <p className="text-center text-emerald-600 text-xs mt-4">Contact your administrator for staff access</p>
      </motion.div>
    </div>
  )
}
