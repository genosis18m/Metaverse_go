import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import '../index.css'

let WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
if (WS_URL.startsWith('http://')) {
  WS_URL = WS_URL.replace('http://', 'ws://')
} else if (WS_URL.startsWith('https://')) {
  WS_URL = WS_URL.replace('https://', 'wss://')
}

interface User {
  x: number
  y: number
  userId: string
  username: string
}

interface ChatMessage {
  userId: string
  username: string
  message: string
  timestamp: Date
}

interface ArenaProps {
  token: string
  userId: string
  username: string
}

export default function Arena({ token, userId, username }: ArenaProps) {
  const { spaceId } = useParams<{ spaceId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  // The display name chosen in the room-entry modal (custom / random / account)
  const displayName = (location.state as { displayName?: string } | null)?.displayName || username
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  // The display name the server confirms back on join (defaults to the chosen one)
  const [myUsername, setMyUsername] = useState(displayName)

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<Map<string, User>>(new Map())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])

  // Keep refs to state so handleMessage never has a stale closure
  const usersRef = useRef<Map<string, User>>(new Map())
  const myUsernameRef = useRef(displayName)
  // Cooldown so a single approach doesn't spam repeated "hi" popups
  const lastHiRef = useRef<Record<string, number>>({})
  const toastIdRef = useRef(0)

  const addSystemMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, {
      userId: 'SYSTEM',
      username: 'SYSTEM',
      message: text,
      timestamp: new Date()
    }])
  }, [])

  const showToast = useCallback((text: string) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, text }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  // handleMessage is defined with useCallback and uses refs for state, not stale closures
  const handleMessage = useCallback((msg: { type: string; payload: any }) => {
    switch (msg.type) {
      case 'space-joined': {
        // The backend always sends the canonical DB username — use it
        const serverUsername = msg.payload.myUsername || myUsernameRef.current
        myUsernameRef.current = serverUsername
        setMyUsername(serverUsername)

        setCurrentUser({
          x: msg.payload.spawn.x,
          y: msg.payload.spawn.y,
          userId,
          username: serverUsername
        })

        const userMap = new Map<string, User>()
        msg.payload.users?.forEach((u: any) => {
          if (u.userId) userMap.set(u.userId, {
            x: u.x,
            y: u.y,
            userId: u.userId,
            username: u.username || u.userId.slice(0, 8)
          })
        })
        usersRef.current = userMap
        setUsers(userMap)

        // Set historical messages if available
        if (msg.payload.messages) {
          const history = msg.payload.messages.map((m: any) => ({
            userId: m.userId,
            username: m.username || m.userId.slice(0, 8),
            message: m.message,
            timestamp: new Date(m.timestamp)
          }))
          setMessages(history)
        }
        break
      }

      case 'user-joined': {
        const joinedUser: User = {
          x: msg.payload.x,
          y: msg.payload.y,
          userId: msg.payload.userId,
          username: msg.payload.username || msg.payload.userId.slice(0, 8)
        }
        setUsers(prev => {
          const newUsers = new Map(prev)
          newUsers.set(msg.payload.userId, joinedUser)
          usersRef.current = newUsers
          return newUsers
        })
        addSystemMessage(`${joinedUser.username} joined`)
        break
      }

      case 'movement': {
        setUsers(prev => {
          const newUsers = new Map(prev)
          const user = newUsers.get(msg.payload.userId)
          if (user) {
            newUsers.set(msg.payload.userId, { ...user, x: msg.payload.x, y: msg.payload.y })
          }
          usersRef.current = newUsers
          return newUsers
        })
        break
      }

      case 'movement-rejected':
        setCurrentUser(prev => prev ? { ...prev, x: msg.payload.x, y: msg.payload.y } : null)
        break

      case 'user-left': {
        const leftUser = usersRef.current.get(msg.payload.userId)
        const leftUsername = leftUser?.username || msg.payload.userId.slice(0, 8)
        setUsers(prev => {
          const newUsers = new Map(prev)
          newUsers.delete(msg.payload.userId)
          usersRef.current = newUsers
          return newUsers
        })
        addSystemMessage(`${leftUsername} left`)
        break
      }

      case 'chat':
        setMessages(prev => [...prev, {
          userId: msg.payload.userId,
          username: msg.payload.username || msg.payload.userId.slice(0, 8),
          message: msg.payload.message,
          timestamp: new Date()
        }])
        break

      case 'hi': {
        const from = msg.payload.username || 'Someone'
        const fromId = msg.payload.userId || from
        const now = Date.now()
        // Ignore repeat greetings from the same person within 4s
        if (now - (lastHiRef.current[fromId] || 0) < 4000) break
        lastHiRef.current[fromId] = now
        showToast(`👋 ${from} sent a hi to you`)
        break
      }
    }
  }, [userId, addSystemMessage, showToast])

  // Keep a ref to handleMessage so the WS onmessage always calls the latest version
  const handleMessageRef = useRef(handleMessage)
  useEffect(() => {
    handleMessageRef.current = handleMessage
  }, [handleMessage])

  useEffect(() => {
    if (!spaceId || !token) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({
        type: 'join',
        // Send the chosen display name; backend falls back to the DB username if empty
        payload: { spaceId, token, displayName }
      }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessageRef.current(message)
      } catch (err) {
        console.error('Failed to parse WS message', err)
      }
    }

    ws.onclose = () => {
      setConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [spaceId, token])

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [messages])

  const handleMove = useCallback((dx: number, dy: number) => {
    setCurrentUser(prev => {
      if (!prev || !wsRef.current) return prev
      const newX = prev.x + dx
      const newY = prev.y + dy
      wsRef.current.send(JSON.stringify({
        type: 'move',
        payload: { x: newX, y: newY }
      }))
      return { ...prev, x: newX, y: newY }
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        switch (e.key) {
          case 'ArrowUp': handleMove(0, -1); break
          case 'ArrowDown': handleMove(0, 1); break
          case 'ArrowLeft': handleMove(-1, 0); break
          case 'ArrowRight': handleMove(1, 0); break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleMove])

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !wsRef.current) return

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      payload: { message: chatInput }
    }))

    // Don't add optimistically — backend broadcasts back to everyone including sender
    setChatInput('')
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(spaceId || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#2a1e49'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    ctx.strokeStyle = 'rgba(201, 184, 232, 0.10)'
    for (let i = 0; i <= canvas.width; i += 40) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }
    for (let i = 0; i <= canvas.height; i += 40) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }

    // Draw current user
    if (currentUser) {
      const x = currentUser.x * 40 + 20
      const y = currentUser.y * 40 + 20

      ctx.shadowColor = '#ff8a5c'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.fillStyle = '#ff8a5c'
      ctx.arc(x, y, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = '#ece4fb'
      ctx.font = 'bold 11px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(myUsername || 'YOU', x, y + 28)
    }

    // Draw other users
    users.forEach(user => {
      const x = user.x * 40 + 20
      const y = user.y * 40 + 20

      ctx.shadowColor = '#7be0c0'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.fillStyle = '#7be0c0'
      ctx.arc(x, y, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = '#ece4fb'
      ctx.font = '10px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(user.username || user.userId.slice(0, 6), x, y + 28)
    })
  }, [currentUser, users, myUsername])

  const [bgType, setBgType] = useState(0)
  useEffect(() => {
    setBgType(Math.floor(Math.random() * 3) + 1)
  }, [])

  const renderBackground = () => {
    switch (bgType) {
      case 1: // JP Matrix
        return (
          <div className="jp-matrix">
            {Array.from({ length: 150 }).map((_, i) => (
              <span key={i}>{Math.random() > 0.5 ? '0' : '1'}</span>
            ))}
          </div>
        )
      case 2: // Marsella
        return <div className="bg-marsella"></div>
      case 3: // Rain Matrix
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
    <div className="arena-container" style={{position: 'relative', overflow: 'hidden'}}>
      {renderBackground()}

      <div className="toast-stack" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className="toast">{t.text}</div>
        ))}
      </div>

      <div style={{position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
        <header className="arena-header" style={{background: 'rgba(26, 26, 46, 0.8)', backdropFilter: 'blur(5px)'}}>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <div className="room-info-header">
            <span className={`status-dot ${connected ? 'connected' : ''}`}></span>
            <span>Room: {spaceId?.slice(0, 10)}...</span>
            <button className="copy-btn" onClick={copyRoomId}>
              {copied ? '✓ Copied!' : '📋 Copy ID'}
            </button>
          </div>
          <div className="user-count">
            👥 {users.size + (currentUser ? 1 : 0)} online
          </div>
        </header>

        <div className="arena-body">
          <div className="game-section">
            <canvas
              ref={canvasRef}
              width={600}
              height={480}
              className="game-canvas"
            />
            <p className="controls-hint">Use Arrow Keys to move</p>
          </div>

          <div className="chat-section" style={{width: '35%', minWidth: '280px', maxWidth: '400px'}}>
            <h3>💬 Chat</h3>
            <div className="chat-messages" ref={chatMessagesRef}>
              {messages.length === 0 && (
                <div className="chat-empty">
                  <span className="chat-empty-emoji">🌱</span>
                  <p>It's quiet here. Say hi to start the conversation!</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.userId === 'SYSTEM' ? 'system' : msg.userId === userId ? 'self' : ''}`}>
                  {msg.userId !== 'SYSTEM' && (
                    <span className="chat-user">
                      {msg.userId === userId ? (myUsername || 'You') : msg.username}:
                    </span>
                  )}
                  <span className="chat-text">{msg.message}</span>
                </div>
              ))}
            </div>
            <form onSubmit={sendChat} className="chat-input-form">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="chat-input"
                style={{flex: 1}}
              />
              <button type="submit" className="send-btn" style={{minWidth: '45px', padding: '0.5rem'}}>➤</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
