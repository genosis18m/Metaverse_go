import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../index.css'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

interface User {
  x: number
  y: number
  userId: string
}

interface ChatMessage {
  userId: string
  message: string
  timestamp: Date
}

interface ArenaProps {
  token: string
  userId: string
}

export default function Arena({ token, userId }: ArenaProps) {
  const { spaceId } = useParams<{ spaceId: string }>()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<Map<string, User>>(new Map())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!spaceId || !token) return

    wsRef.current = new WebSocket(WS_URL)
    
    wsRef.current.onopen = () => {
      setConnected(true)
      wsRef.current?.send(JSON.stringify({
        type: 'join',
        payload: { spaceId, token }
      }))
    }

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleMessage(message)
    }

    wsRef.current.onclose = () => {
      setConnected(false)
    }

    return () => {
      wsRef.current?.close()
    }
  }, [spaceId, token])

  const handleMessage = (msg: { type: string; payload: any }) => {
    switch (msg.type) {
      case 'space-joined':
        setCurrentUser({
          x: msg.payload.spawn.x,
          y: msg.payload.spawn.y,
          userId
        })
        const userMap = new Map<string, User>()
        msg.payload.users?.forEach((u: any) => {
          if (u.userId) userMap.set(u.userId, u)
        })
        setUsers(userMap)
        break

      case 'user-joined':
        setUsers(prev => {
          const newUsers = new Map(prev)
          newUsers.set(msg.payload.userId, {
            x: msg.payload.x,
            y: msg.payload.y,
            userId: msg.payload.userId
          })
          return newUsers
        })
        addSystemMessage(`${msg.payload.userId.slice(0, 8)} joined`)
        break

      case 'movement':
        setUsers(prev => {
          const newUsers = new Map(prev)
          const user = newUsers.get(msg.payload.userId)
          if (user) {
            newUsers.set(msg.payload.userId, { ...user, x: msg.payload.x, y: msg.payload.y })
          }
          return newUsers
        })
        break

      case 'movement-rejected':
        setCurrentUser(prev => prev ? { ...prev, x: msg.payload.x, y: msg.payload.y } : null)
        break

      case 'user-left':
        setUsers(prev => {
          const newUsers = new Map(prev)
          newUsers.delete(msg.payload.userId)
          return newUsers
        })
        addSystemMessage(`${msg.payload.userId.slice(0, 8)} left`)
        break

      case 'chat':
        setMessages(prev => [...prev, {
          userId: msg.payload.userId,
          message: msg.payload.message,
          timestamp: new Date()
        }])
        break
    }
  }

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      userId: 'SYSTEM',
      message: text,
      timestamp: new Date()
    }])
  }

  const handleMove = (dx: number, dy: number) => {
    if (!currentUser || !wsRef.current) return
    const newX = currentUser.x + dx
    const newY = currentUser.y + dy
    
    setCurrentUser(prev => prev ? { ...prev, x: newX, y: newY } : null)
    
    wsRef.current.send(JSON.stringify({
      type: 'move',
      payload: { x: newX, y: newY }
    }))
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const isChatFocused = document.activeElement === chatInputRef.current
    
    // Arrow keys always work for movement (even while typing)
    if (e.key.startsWith('Arrow')) {
      e.preventDefault()
      switch (e.key) {
        case 'ArrowUp': handleMove(0, -1); break
        case 'ArrowDown': handleMove(0, 1); break
        case 'ArrowLeft': handleMove(-1, 0); break
        case 'ArrowRight': handleMove(1, 0); break
      }
      return
    }
    
    // WASD only works when chat is not focused
    if (!isChatFocused) {
      switch (e.key) {
        case 'w': case 'W': handleMove(0, -1); break
        case 's': case 'S': handleMove(0, 1); break
        case 'a': case 'A': handleMove(-1, 0); break
        case 'd': case 'D': handleMove(1, 0); break
      }
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentUser])

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !wsRef.current) return
    
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      payload: { message: chatInput }
    }))
    
    setMessages(prev => [...prev, {
      userId,
      message: chatInput,
      timestamp: new Date()
    }])
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

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    ctx.strokeStyle = '#2d2d44'
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
      
      ctx.shadowColor = '#FF6B6B'
      ctx.shadowBlur = 15
      ctx.beginPath()
      ctx.fillStyle = '#FF6B6B'
      ctx.arc(x, y, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('YOU', x, y + 28)
    }

    // Draw other users
    users.forEach(user => {
      const x = user.x * 40 + 20
      const y = user.y * 40 + 20
      
      ctx.shadowColor = '#4ECDC4'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.fillStyle = '#4ECDC4'
      ctx.arc(x, y, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      
      ctx.fillStyle = '#fff'
      ctx.font = '9px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(user.userId.slice(0, 6), x, y + 28)
    })
  }, [currentUser, users])

  return (
    <div className="arena-container">
      <header className="arena-header">
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
          <p className="controls-hint">Use WASD or Arrow Keys to move</p>
        </div>

        <div className="chat-section">
          <h3>💬 Chat</h3>
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.userId === 'SYSTEM' ? 'system' : msg.userId === userId ? 'self' : ''}`}>
                {msg.userId !== 'SYSTEM' && (
                  <span className="chat-user">{msg.userId === userId ? 'You' : msg.userId.slice(0, 6)}:</span>
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
            />
            <button type="submit" className="send-btn">Send</button>
          </form>
        </div>
      </div>
    </div>
  )
}
