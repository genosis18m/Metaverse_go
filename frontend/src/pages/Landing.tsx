import { useState } from 'react'
import '../index.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface LandingProps {
  onLogin: (token: string, userId: string) => void
}

export default function Landing({ onLogin }: LandingProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        // Sign in
        const res = await fetch(`${API_URL}/api/v1/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Login failed')
        
        // Decode token to get userId
        const payload = JSON.parse(atob(data.token.split('.')[1]))
        onLogin(data.token, payload.userId)
      } else {
        // Sign up
        const res = await fetch(`${API_URL}/api/v1/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, type: 'user' })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Signup failed')
        
        // Auto-login after signup
        const loginRes = await fetch(`${API_URL}/api/v1/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })
        const loginData = await loginRes.json()
        if (!loginRes.ok) throw new Error(loginData.message || 'Auto-login failed')
        
        const payload = JSON.parse(atob(loginData.token.split('.')[1]))
        onLogin(loginData.token, payload.userId)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-hero">
          <h1>🌐 2D Metaverse</h1>
          <p>Create rooms, invite friends, chat and explore together!</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <button 
              type="button" 
              className="google-btn"
              onClick={() => window.location.href = `${API_URL}/api/v1/auth/google`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" style={{marginRight: '8px'}}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>
        </div>

        <div className="landing-features">
          <div className="feature">
            <span className="feature-icon">🏠</span>
            <h3>Create Rooms</h3>
            <p>Design your own virtual spaces</p>
          </div>
          <div className="feature">
            <span className="feature-icon">👥</span>
            <h3>Multiplayer</h3>
            <p>Explore together in real-time</p>
          </div>
          <div className="feature">
            <span className="feature-icon">💬</span>
            <h3>Live Chat</h3>
            <p>Talk with others in your space</p>
          </div>
        </div>
      </div>
    </div>
  )
}
