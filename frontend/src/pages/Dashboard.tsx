import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../index.css'
import Loader from '../components/Loader'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface Space {
  id: string
  name: string
  dimensions: string
  thumbnail?: string
}

interface DashboardProps {
  token: string
  onLogout: () => void
}

export default function Dashboard({ token, onLogout }: DashboardProps) {
  const navigate = useNavigate()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [roomSize, setRoomSize] = useState('20x20')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchSpaces()
  }, [])

  const fetchSpaces = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/space/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setSpaces(data.spaces || [])
    } catch (err) {
      console.error('Failed to fetch spaces:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    
    try {
      const res = await fetch(`${API_URL}/api/v1/user/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update username')
      
      setSuccessMsg('Username updated successfully!')
      setTimeout(() => setShowEditProfileModal(false), 1500)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    
    try {
      const res = await fetch(`${API_URL}/api/v1/space/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newRoomName,
          dimensions: roomSize,
          mapId: 'default' // Add default mapId
        })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to create room')
      }
      
      const data = await res.json()
      
      // OPTIMIZATION: Manually add new room instead of re-fetching
      const newRoom: Space = {
        id: data.spaceId,
        name: newRoomName,
        dimensions: roomSize,
      }
      setSpaces(prev => [...prev, newRoom])
      
      setShowCreateModal(false)
      setNewRoomName('')
      // fetchSpaces() // Removed to speed up UI
      navigate(`/arena/${data.spaceId}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (joinRoomId.trim()) {
      navigate(`/arena/${joinRoomId}`)
    }
  }

  const handleDeleteRoom = async (spaceId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return
    
    try {
      await fetch(`${API_URL}/api/v1/space/${spaceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchSpaces()
    } catch (err) {
      console.error('Failed to delete room:', err)
    }
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <h1>🌐 2D Metaverse</h1>
          <button 
            className="action-btn" 
            style={{padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.1)'}}
            onClick={() => {
              setNewUsername('')
              setSuccessMsg('')
              setError('')
              setShowEditProfileModal(true)
            }}
          >
            ✏️ Edit Profile
          </button>
        </div>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-actions">
          <button className="action-btn create-btn" onClick={() => setShowCreateModal(true)}>
            ➕ Create Room
          </button>
          <button className="action-btn join-btn" onClick={() => setShowJoinModal(true)}>
            🚪 Join Room
          </button>
        </div>

        <h2>Your Rooms</h2>
        
        {loading ? (
          <div className="loader-wrapper" style={{display: 'flex', justifyContent: 'center', padding: '3rem'}}>
            <Loader />
          </div>
        ) : spaces.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any rooms yet.</p>
            <p>Create one to get started!</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {spaces.map(space => (
              <div key={space.id} className="room-card">
                <div className="room-preview">
                  <span className="room-emoji">🏠</span>
                </div>
                <div className="room-info">
                  <h3>{space.name}</h3>
                  <p className="room-size">{space.dimensions}</p>
                  <p className="room-id">ID: {space.id.slice(0, 8)}...</p>
                </div>
                <div className="room-actions">
                  <button 
                    className="enter-btn"
                    onClick={() => navigate(`/arena/${space.id}`)}
                  >
                    Enter
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteRoom(space.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {isSubmitting ? (
               <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem'}}>
                 <Loader />
                 <p style={{marginTop: '1rem', color: '#666'}}>Creating your room...</p>
               </div>
            ) : (
                <>
                <h2>Create New Room</h2>
                <form onSubmit={handleCreateRoom}>
                  <div className="form-group">
                    <label>Room Name</label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="My Awesome Room"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Room Size</label>
                    <select value={roomSize} onChange={(e) => setRoomSize(e.target.value)}>
                      <option value="10x10">Small (10x10)</option>
                      <option value="20x20">Medium (20x20)</option>
                      <option value="30x30">Large (30x30)</option>
                      <option value="50x50">Huge (50x50)</option>
                    </select>
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Create Room
                    </button>
                  </div>
                </form>
                </>
            )}
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowJoinModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {isSubmitting ? (
               <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem'}}>
                 <Loader />
                 <p style={{marginTop: '1rem', color: '#666'}}>Joining room...</p>
               </div>
            ) : (
                <>
                <h2 style={{marginBottom: '1.5rem'}}>Join a Room</h2>
                <form onSubmit={handleJoinRoom}>
                  <div className="uiverse-pixel-input-wrapper">
                    <label className="uiverse-pixel-label">Room ID</label>
                    <input
                      className="uiverse-pixel-input"
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      placeholder="Paste the room ID here"
                      required
                    />
                  </div>
                  <p className="help-text" style={{marginTop: '1rem'}}>Ask your friend for their Room ID to join!</p>
                  <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowJoinModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Join Room
                    </button>
                  </div>
                </form>
                </>
            )}
          </div>
        </div>
      )}
      {/* Edit Username Modal */}
      {showEditProfileModal && (
        <div className="modal-overlay" onClick={() => setShowEditProfileModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Profile</h2>
            <form onSubmit={handleUpdateUsername}>
              <div className="form-group">
                <label>New Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  minLength={3}
                  maxLength={50}
                  required
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              {successMsg && <div className="success-message" style={{color: '#4ECDC4', marginBottom: '1rem', textAlign: 'center'}}>{successMsg}</div>}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEditProfileModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
