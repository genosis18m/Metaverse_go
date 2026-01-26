import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../index.css'
import Loader from '../components/Loader'
import RoomEntryModal from '../components/RoomEntryModal'

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
  const [currentUsername, setCurrentUsername] = useState('')
  const [bgType] = useState(() => Math.floor(Math.random() * 3) + 1)
  const [joinError, setJoinError] = useState('')
  
  // Room entry modal state
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null)
  
  // Rooms drawer state
  const [showRoomsDrawer, setShowRoomsDrawer] = useState(false)

  useEffect(() => {
    fetchSpaces()
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.username) {
        setCurrentUsername(data.username)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }

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
      setCurrentUsername(newUsername) // Update displayed username
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
          dimensions: roomSize
          // mapId removed - causes lookup failure
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
      setIsSubmitting(false)
      
      // Show entry modal after create modal closes
      setTimeout(() => {
        setPendingRoomId(data.spaceId)
        setShowEntryModal(true)
      }, 100)
    } catch (err: any) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinError('')
    if (!joinRoomId.trim()) return
    
    // Validate room exists
    try {
      const res = await fetch(`${API_URL}/api/v1/space/${joinRoomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        setJoinError('Room not found. Please check the ID.')
        return
      }
      
      // Show entry modal after join modal closes
      setShowJoinModal(false)
      setTimeout(() => {
        setPendingRoomId(joinRoomId)
        setShowEntryModal(true)
      }, 100)
    } catch (err) {
      setJoinError('Failed to verify room. Please try again.')
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

  const handleEnterRoom = (spaceId: string) => {
    setPendingRoomId(spaceId)
    setShowEntryModal(true)
  }

  const handleEntryConfirm = (displayName: string) => {
    if (pendingRoomId) {
      navigate(`/arena/${pendingRoomId}`, { state: { displayName } })
      setPendingRoomId(null)
      setShowEntryModal(false)
    }
  }

  const renderBackground = () => {
    switch (bgType) {
      case 1:
        return (
          <div className="jp-matrix">
            {Array.from({ length: 150 }).map((_, i) => (
              <span key={i}>{Math.random() > 0.5 ? '0' : '1'}</span>
            ))}
          </div>
        )
      case 2:
        return <div className="bg-marsella"></div>
      case 3:
        return (
          <div className="matrix-bg-container">
             <div className="matrix-pattern">
               {Array.from({ length: 40 }).map((_, i) => (
                 <div key={i} className="matrix-column"></div>
               ))}
             </div>
          </div>
        )
      default:
        return <div className="bg-marsella"></div>
    }
  }

  return (
    <div className="dashboard-container" style={{position: 'relative', overflow: 'hidden'}}>
      {renderBackground()}
      <div style={{position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <header className="dashboard-header" style={{background: 'rgba(26, 26, 46, 0.8)', backdropFilter: 'blur(5px)', width: '100%'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <h1 className="glitch-logo" style={{fontSize: '1.8rem'}}>METAVERSE</h1>
          {currentUsername && <span style={{color: '#4ECDC4'}}>Welcome, {currentUsername}!</span>}
          <button 
            className="action-btn" 
            style={{padding: '0.5rem', fontSize: '1.2rem', background: 'transparent', border: 'none', cursor: 'pointer'}}
            onClick={() => {
              setNewUsername(currentUsername)
              setSuccessMsg('')
              setError('')
              setShowEditProfileModal(true)
            }}
            title="Edit Profile"
          >
            ✏️
          </button>
        </div>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </header>

      <main className="dashboard-main" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem'}}>
        <div className="dashboard-actions" style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
          <button 
            onClick={() => setShowCreateModal(true)}
            style={{
              fontFamily: 'inherit',
              border: 'none',
              outline: '1px dotted rgb(37, 37, 37)',
              outlineOffset: '-4px',
              cursor: 'pointer',
              background: 'hsl(120deg 40% 65%)',
              boxShadow: 'inset -1px -1px #292929, inset 1px 1px #fff, inset -2px -2px rgb(100, 180, 100), inset 2px 2px #ffffff',
              fontSize: '16px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              padding: '12px 40px'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.boxShadow = 'inset -1px -1px #fff, inset 1px 1px #292929, inset -2px -2px #ffffff, inset 2px 2px rgb(100, 180, 100)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.boxShadow = 'inset -1px -1px #292929, inset 1px 1px #fff, inset -2px -2px rgb(100, 180, 100), inset 2px 2px #ffffff'
            }}
          >
            ➕ Create Room
          </button>
          <button 
            onClick={() => setShowJoinModal(true)}
            style={{
              fontFamily: 'inherit',
              border: 'none',
              outline: '1px dotted rgb(37, 37, 37)',
              outlineOffset: '-4px',
              cursor: 'pointer',
              background: 'hsl(200deg 50% 70%)',
              boxShadow: 'inset -1px -1px #292929, inset 1px 1px #fff, inset -2px -2px rgb(100, 150, 200), inset 2px 2px #ffffff',
              fontSize: '16px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              padding: '12px 40px'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.boxShadow = 'inset -1px -1px #fff, inset 1px 1px #292929, inset -2px -2px #ffffff, inset 2px 2px rgb(100, 150, 200)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.boxShadow = 'inset -1px -1px #292929, inset 1px 1px #fff, inset -2px -2px rgb(100, 150, 200), inset 2px 2px #ffffff'
            }}
          >
            🚪 Join Room
          </button>
        </div>

        <button 
          onClick={() => setShowRoomsDrawer(!showRoomsDrawer)}
          style={{
            fontFamily: 'inherit',
            border: 'none',
            outline: '1px dotted rgb(37, 37, 37)',
            outlineOffset: '-4px',
            cursor: 'pointer',
            background: 'hsl(280deg 40% 70%)',
            boxShadow: 'inset -1px -1px #292929, inset 1px 1px #fff, inset -2px -2px rgb(150, 100, 180), inset 2px 2px #ffffff',
            fontSize: '16px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            padding: '12px 50px'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = 'inset -1px -1px #fff, inset 1px 1px #292929, inset -2px -2px #ffffff, inset 2px 2px rgb(150, 100, 180)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = 'inset -1px -1px #292929, inset 1px 1px #fff, inset -2px -2px rgb(150, 100, 180), inset 2px 2px #ffffff'
          }}
        >
          📁 Your Rooms {showRoomsDrawer ? '▲' : '▼'}
        </button>

        <div 
          className="rooms-drawer" 
          style={{
            maxHeight: showRoomsDrawer ? '400px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease-in-out',
            width: '100%',
            maxWidth: '800px'
          }}
        >
          {loading ? (
            <div className="loader-wrapper" style={{display: 'flex', justifyContent: 'center', padding: '2rem'}}>
              <Loader />
            </div>
          ) : spaces.length === 0 ? (
            <div className="empty-state" style={{textAlign: 'center', padding: '2rem'}}>
              <p>You don't have any rooms yet.</p>
              <p>Create one to get started!</p>
            </div>
          ) : (
            <div className="rooms-grid" style={{padding: '1rem 0'}}>
              {spaces.slice(-3).reverse().map(space => (
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
                      onClick={() => handleEnterRoom(space.id)}
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
        </div>
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
                  {joinError && <div className="error-message" style={{color: '#FF6B6B', marginTop: '0.5rem'}}>{joinError}</div>}
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

      {/* Room Entry Modal */}
      <RoomEntryModal
        isOpen={showEntryModal}
        onClose={() => {
          setShowEntryModal(false)
          setPendingRoomId(null)
        }}
        onEnter={handleEntryConfirm}
        accountUsername={currentUsername}
      />
    </div>
    </div>
  )
}
