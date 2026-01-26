import { useState, useEffect } from 'react'
import '../index.css'

// Famous anime characters for anonymous mode
const ANIME_CHARACTERS = [
  'Naruto', 'Sasuke', 'Goku', 'Vegeta', 'Luffy', 'Zoro', 'Ichigo', 'Rukia',
  'Light', 'L', 'Eren', 'Mikasa', 'Levi', 'Tanjiro', 'Nezuko', 'Gojo',
  'Itadori', 'Kakashi', 'Sakura', 'Hinata', 'Deku', 'Bakugo', 'Todoroki',
  'AllMight', 'Saitama', 'Genos', 'Mob', 'Reigen', 'Edward', 'Alphonse',
  'Spike', 'Faye', 'Lelouch', 'Suzaku', 'Natsu', 'Erza', 'Gon', 'Killua',
  'Kurapika', 'Hisoka', 'Kirito', 'Asuna', 'Rem', 'Emilia', 'Subaru',
  'Ainz', 'Albedo', 'Tanya', 'Rimuru', 'Milim', 'Anos', 'Misaka', 'Accelerator',
  'Shinji', 'Asuka', 'Rei', 'Sailor Moon', 'Sailor Mars', 'Pikachu', 'Ash'
]

interface RoomEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onEnter: (displayName: string) => void
  accountUsername: string
  existingUsers?: string[] // usernames already in the room
}

type EntryMode = 'username' | 'custom' | 'anonymous'

export default function RoomEntryModal({ 
  isOpen, 
  onClose, 
  onEnter, 
  accountUsername,
  existingUsers = []
}: RoomEntryModalProps) {
  const [mode, setMode] = useState<EntryMode>('username')
  const [customName, setCustomName] = useState('')
  const [selectedAnime, setSelectedAnime] = useState('')
  const [error, setError] = useState('')

  // Get available anime characters (not already in use)
  const availableAnimeChars = ANIME_CHARACTERS.filter(
    name => !existingUsers.some(u => u.toLowerCase() === name.toLowerCase())
  )

  // Select random anime character on load
  useEffect(() => {
    if (availableAnimeChars.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableAnimeChars.length)
      setSelectedAnime(availableAnimeChars[randomIndex])
    }
  }, [isOpen])

  const handleSubmit = () => {
    setError('')
    
    let displayName = ''
    
    switch (mode) {
      case 'username':
        displayName = accountUsername
        break
      case 'custom':
        if (!customName.trim()) {
          setError('Please enter a custom name')
          return
        }
        if (customName.length < 2 || customName.length > 20) {
          setError('Name must be 2-20 characters')
          return
        }
        // Check if name is already in use
        if (existingUsers.some(u => u.toLowerCase() === customName.toLowerCase())) {
          setError('This name is already taken in the room')
          return
        }
        displayName = customName.trim()
        break
      case 'anonymous':
        if (!selectedAnime) {
          setError('No available anime characters. Try a custom name.')
          return
        }
        displayName = selectedAnime
        break
    }
    
    onEnter(displayName)
  }

  const shuffleAnimeCharacter = () => {
    if (availableAnimeChars.length > 1) {
      let newChar = selectedAnime
      while (newChar === selectedAnime) {
        const randomIndex = Math.floor(Math.random() * availableAnimeChars.length)
        newChar = availableAnimeChars[randomIndex]
      }
      setSelectedAnime(newChar)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal room-entry-modal" onClick={e => e.stopPropagation()} style={{maxWidth: '450px'}}>
        <h2 style={{marginBottom: '1.5rem', textAlign: 'center'}}>Choose Your Display Name</h2>
        
        <div className="entry-options" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {/* Option 1: Use Account Username */}
          <label 
            className={`entry-option ${mode === 'username' ? 'selected' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              border: mode === 'username' ? '2px solid #4ECDC4' : '2px solid rgba(255,255,255,0.1)',
              background: mode === 'username' ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <input 
              type="radio" 
              name="entryMode" 
              checked={mode === 'username'}
              onChange={() => setMode('username')}
              style={{width: '20px', height: '20px'}}
            />
            <div style={{flex: 1}}>
              <div style={{fontWeight: 'bold', marginBottom: '0.25rem'}}>👤 Use My Username</div>
              <div style={{color: '#4ECDC4', fontSize: '0.9rem'}}>{accountUsername}</div>
            </div>
          </label>

          {/* Option 2: Custom Name */}
          <label 
            className={`entry-option ${mode === 'custom' ? 'selected' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '1rem',
              borderRadius: '8px',
              border: mode === 'custom' ? '2px solid #FF6B6B' : '2px solid rgba(255,255,255,0.1)',
              background: mode === 'custom' ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <input 
                type="radio" 
                name="entryMode" 
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
                style={{width: '20px', height: '20px'}}
              />
              <div style={{fontWeight: 'bold'}}>✏️ Custom Name</div>
            </div>
            {mode === 'custom' && (
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={20}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'white',
                  fontSize: '1rem'
                }}
                onClick={e => e.stopPropagation()}
              />
            )}
          </label>

          {/* Option 3: Anonymous Anime */}
          <label 
            className={`entry-option ${mode === 'anonymous' ? 'selected' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '1rem',
              borderRadius: '8px',
              border: mode === 'anonymous' ? '2px solid #9B59B6' : '2px solid rgba(255,255,255,0.1)',
              background: mode === 'anonymous' ? 'rgba(155, 89, 182, 0.1)' : 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <input 
                type="radio" 
                name="entryMode" 
                checked={mode === 'anonymous'}
                onChange={() => setMode('anonymous')}
                style={{width: '20px', height: '20px'}}
              />
              <div style={{flex: 1}}>
                <div style={{fontWeight: 'bold'}}>🎭 Anonymous (Anime Character)</div>
              </div>
            </div>
            {mode === 'anonymous' && (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem'}}>
                <span style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(155, 89, 182, 0.3)',
                  color: '#9B59B6',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  textAlign: 'center'
                }}>
                  {selectedAnime || 'No characters available'}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); shuffleAnimeCharacter(); }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(155, 89, 182, 0.5)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  🔀
                </button>
              </div>
            )}
          </label>
        </div>

        {error && (
          <div style={{color: '#FF6B6B', textAlign: 'center', marginTop: '1rem'}}>
            {error}
          </div>
        )}

        <div className="modal-actions" style={{marginTop: '1.5rem'}}>
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={onClose}
            style={{padding: '0.75rem 1.5rem'}}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="submit-btn" 
            onClick={handleSubmit}
            style={{padding: '0.75rem 1.5rem'}}
          >
            Enter Room
          </button>
        </div>
      </div>
    </div>
  )
}
