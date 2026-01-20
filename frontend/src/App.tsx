import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Arena from './pages/Arena'
import OAuthCallback from './pages/OAuthCallback'
import './index.css'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'))
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'))

  const handleLogin = (newToken: string, newUserId: string, newUsername?: string) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('userId', newUserId)
    if (newUsername) localStorage.setItem('username', newUsername)
    setToken(newToken)
    setUserId(newUserId)
    if (newUsername) setUsername(newUsername)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    setToken(null)
    setUserId(null)
    setUsername(null)
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            token ? <Navigate to="/dashboard" /> : <Landing onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/oauth-callback" 
          element={<OAuthCallback onLogin={handleLogin} />} 
        />
        <Route 
          path="/dashboard" 
          element={
            token ? <Dashboard token={token} onLogout={handleLogout} /> : <Navigate to="/" />
          } 
        />
        <Route 
          path="/arena/:spaceId" 
          element={
            token ? <Arena token={token} userId={userId || ''} username={username || ''} /> : <Navigate to="/" />
          } 
        />
      </Routes>
    </Router>
  )
}

export default App
