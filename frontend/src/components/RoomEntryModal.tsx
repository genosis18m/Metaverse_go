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
      <div className="modal room-entry-modal" onClick={e => e.stopPropagation()}>
        <h2 style={{textAlign: 'center'}}>Choose your display name</h2>

        <div className="entry-options">
          {/* Option 1: Use Account Username */}
          <label className={`entry-option ${mode === 'username' ? 'selected' : ''}`} data-accent="mint">
            <div className="entry-option-head">
              <input
                type="radio"
                name="entryMode"
                checked={mode === 'username'}
                onChange={() => setMode('username')}
              />
              <div style={{flex: 1}}>
                <div className="entry-option-title">👤 Use my username</div>
                <div className="entry-option-sub mint">{accountUsername}</div>
              </div>
            </div>
          </label>

          {/* Option 2: Custom Name */}
          <label className={`entry-option ${mode === 'custom' ? 'selected' : ''}`} data-accent="peach">
            <div className="entry-option-head">
              <input
                type="radio"
                name="entryMode"
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
              />
              <div className="entry-option-title">✏️ Custom name</div>
            </div>
            {mode === 'custom' && (
              <input
                className="entry-input"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={20}
                onClick={e => e.stopPropagation()}
              />
            )}
          </label>

          {/* Option 3: Anonymous Anime */}
          <label className={`entry-option ${mode === 'anonymous' ? 'selected' : ''}`} data-accent="violet">
            <div className="entry-option-head">
              <input
                type="radio"
                name="entryMode"
                checked={mode === 'anonymous'}
                onChange={() => setMode('anonymous')}
              />
              <div className="entry-option-title">🎭 Anonymous (anime character)</div>
            </div>
            {mode === 'anonymous' && (
              <div className="anime-row">
                <span className="anime-name">
                  {selectedAnime || 'No characters available'}
                </span>
                <button
                  type="button"
                  className="anime-shuffle"
                  onClick={(e) => { e.stopPropagation(); shuffleAnimeCharacter(); }}
                >
                  🔀
                </button>
              </div>
            )}
          </label>
        </div>

        {error && <div className="error-message" style={{textAlign: 'center'}}>{error}</div>}

        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="submit-btn" onClick={handleSubmit}>
            Enter room
          </button>
        </div>
      </div>
    </div>
  )
}
