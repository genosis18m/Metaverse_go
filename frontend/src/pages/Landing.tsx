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
