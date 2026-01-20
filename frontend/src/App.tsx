import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Arena from './pages/Arena'
import './index.css'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'))

  const handleLogin = (newToken: string, newUserId: string) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('userId', newUserId)
    setToken(newToken)
    setUserId(newUserId)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    setToken(null)
    setUserId(null)
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
          path="/dashboard" 
          element={
            token ? <Dashboard token={token} onLogout={handleLogout} /> : <Navigate to="/" />
          } 
        />
        <Route 
          path="/arena/:spaceId" 
          element={
            token ? <Arena token={token} userId={userId || ''} /> : <Navigate to="/" />
          } 
        />
      </Routes>
    </Router>
  )
}

export default App
