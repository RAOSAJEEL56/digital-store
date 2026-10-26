import { useRef, useState } from 'react'
import { Button, Panel, TextInput } from './UI.jsx'
import { useStore } from '../../context/store.js'

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
}

function resizeAvatar(file) {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Profile ke liye image file select karein.'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Image read nahi ho saki. Dobara try karein.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Image open nahi ho saki. Doosri image try karein.'))
      image.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Image process nahi ho saki.'))
          return
        }
        const cropSize = Math.min(image.width, image.height)
        context.drawImage(
          image,
          (image.width - cropSize) / 2,
          (image.height - cropSize) / 2,
          cropSize,
          cropSize,
          0,
          0,
          size,
          size,
        )
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function Avatar({ user, className = '' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-emerald-900 font-black text-white ${className}`}>
      {user?.avatar
        ? <img src={user.avatar} alt="" className="h-full w-full object-cover" />
        : initials(user?.name)}
    </span>
  )
}

export default function AccountMenu() {
  const { activeUser, users, signUp, login, logout, updateUserProfile } = useStore()
  const [mode, setMode] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const uploadRef = useRef(null)

  const startAuth = (nextMode) => {
    setMode(nextMode)
    setMenuOpen(false)
    setError('')
    setName('')
    setEmail('')
    setPassword('')
    setAvatar('')
  }

  const handleImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const image = await resizeAvatar(file)
      if (activeUser && !mode) {
        updateUserProfile({ name: activeUser.name, avatar: image })
      } else {
        setAvatar(image)
      }
      setError('')
    } catch (imageError) {
      setError(imageError.message)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (mode === 'signup' && !name.trim()) {
      setError('Apna naam enter karein.')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Valid email address enter karein.')
      return
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password kam az kam 8 characters ka hona chahiye.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'signup') await signUp({ name, email, password, avatar })
      else await login({ email, password })
      setMode(null)
      setPassword('')
      setAvatar('')
    } catch (authError) {
      setError(authError.message)
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = () => {
    try {
      logout()
      setMenuOpen(false)
    } catch (logoutError) {
      setError(logoutError.message)
    }
  }

  return (
    <>
      <div className="relative flex shrink-0 items-center gap-2">
        {activeUser ? (
          <>
            <span className="max-w-16 truncate text-right text-[10px] font-extrabold text-white sm:max-w-28 sm:text-xs lg:max-w-40">{activeUser.name}</span>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Open account menu"
              aria-expanded={menuOpen}
              className="rounded-full outline-none ring-0 transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Avatar user={activeUser} className="h-10 w-10 border-[3px] border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.4)] sm:h-11 sm:w-11" />
            </button>
            {menuOpen && (
              <Panel className="absolute right-0 top-[calc(100%+12px)] z-50 w-64 overflow-visible p-3 shadow-xl">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <Avatar user={activeUser} className="h-10 w-10 border-emerald-100 bg-emerald-700" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-800">{activeUser.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{activeUser.email}</p>
                  </div>
                </div>
                <button type="button" onClick={() => uploadRef.current?.click()} className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <i className="fa-solid fa-image w-4 text-center text-emerald-700" aria-hidden="true" /> Change profile photo
                </button>
                <button type="button" onClick={handleLogout} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50">
                  <i className="fa-solid fa-right-from-bracket w-4 text-center" aria-hidden="true" /> Log out
                </button>
                {error && <p className="mt-2 text-[11px] text-rose-700">{error}</p>}
              </Panel>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={() => startAuth('login')} className="rounded-lg px-2 py-2 text-[11px] font-extrabold text-white transition hover:bg-white/10 sm:px-3 sm:text-xs">Login</button>
            <button type="button" onClick={() => startAuth('signup')} className="rounded-lg bg-white px-2.5 py-2 text-[11px] font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:px-3 sm:text-xs">Sign up</button>
          </>
        )}
        <input ref={uploadRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
      </div>

      {mode && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={mode === 'signup' ? 'Create account' : 'Login'}>
          <Panel className="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden shadow-2xl">
            <div className="flex shrink-0 items-center justify-between bg-emerald-800 px-5 py-4 text-white">
              <div>
                <h2 className="text-base font-extrabold">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
                <p className="mt-0.5 text-[11px] text-emerald-100">Account is saved on this browser</p>
              </div>
              <button type="button" onClick={() => setMode(null)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-white/10"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </div>
            <form onSubmit={submit} className="space-y-3.5 overflow-y-auto p-5">
              {mode === 'signup' && (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar user={{ name, avatar }} className="h-12 w-12 border-emerald-100 bg-emerald-700" />
                    <button type="button" onClick={() => uploadRef.current?.click()} className="text-left text-xs font-bold text-emerald-800 hover:text-emerald-950">
                      Add profile photo
                      <span className="mt-0.5 block text-[10px] font-medium text-slate-500">Optional · JPG, PNG or other image</span>
                    </button>
                  </div>
                  <label className="block text-xs font-bold text-slate-600">Your name<TextInput autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1" placeholder="Full name" /></label>
                </>
              )}
              <label className="block text-xs font-bold text-slate-600">Email<TextInput type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1" placeholder="you@example.com" /></label>
              <label className="block text-xs font-bold text-slate-600">Password<TextInput type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1" placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} /></label>
              {mode === 'login' && users.length === 0 && <p className="rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800">No account yet? Create one to continue.</p>}
              {error && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Login'}</Button>
              <p className="text-center text-xs text-slate-500">
                {mode === 'signup' ? 'Already registered?' : 'New to this browser?'}{' '}
                <button type="button" onClick={() => startAuth(mode === 'signup' ? 'login' : 'signup')} className="font-extrabold text-emerald-800 hover:underline">
                  {mode === 'signup' ? 'Login' : 'Sign up'}
                </button>
              </p>
            </form>
          </Panel>
        </div>
      )}
    </>
  )
}
