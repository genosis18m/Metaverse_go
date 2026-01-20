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

        <div className="wrapper">
          <div className="card-switch">
            <label className="switch">
              <input type="checkbox" className="toggle" checked={!isLogin} onChange={() => setIsLogin(!isLogin)} />
              
              <div className="toggle-wrapper">
                <span className="slider"></span>
                <span className="card-side"></span>
              </div>
              
              <div className="flip-card__inner">
                {/* LOGIN CARD (FRONT) */}
                <div className="flip-card__front">
                  <div className="title">Log in</div>
                  <form onSubmit={handleSubmit} className="flip-card__form">
                    <input
                      className="flip-card__input"
                      name="username"
                      placeholder="Username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                    <input
                      className="flip-card__input"
                      name="password"
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button className="flip-card__btn" type="submit" disabled={loading}>
                      {loading ? 'Logging in...' : 'Let\'s go!'}
                    </button>
                    {error && <p className="error-message" style={{color: 'red', fontSize: '0.8rem'}}>{error}</p>}
                  </form>
                  
                  <div className="google-auth-container">
                     <span style={{fontSize: '0.8rem'}}>or</span>
                     <button className="google-btn" onClick={() => window.location.href = `${API_URL}/api/v1/auth/google`}>
                       <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" width="20" height="20" />
                       Continue with Google
                     </button>
                  </div>
                </div>

                {/* SIGNUP CARD (BACK) */}
                <div className="flip-card__back">
                  <div className="title">Sign up</div>
                  <form onSubmit={handleSubmit} className="flip-card__form">
                     <input
                      className="flip-card__input"
                      name="username"
                      placeholder="Username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                    <input
                      className="flip-card__input"
                      name="password"
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button className="flip-card__btn" type="submit" disabled={loading}>
                      {loading ? 'Signing up...' : 'Confirm!'}
                    </button>
                    {error && <p className="error-message" style={{color: 'red', fontSize: '0.8rem'}}>{error}</p>}
                  </form>
                  
                  <div className="google-auth-container">
                     <span style={{fontSize: '0.8rem'}}>or</span>
                     <button className="google-btn" onClick={() => window.location.href = `${API_URL}/api/v1/auth/google`}>
                       <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" width="20" height="20" />
                       Continue with Google
                     </button>
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="landing-features" style={{marginTop: '4rem'}}> 
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
