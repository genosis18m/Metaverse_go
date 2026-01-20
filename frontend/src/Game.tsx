import { useEffect, useRef, useState } from 'react';

// WebSocket URL - configurable via environment
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

interface User {
  x: number;
  y: number;
  userId: string;
}

interface Params {
  token: string;
  spaceId: string;
}

const Arena = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [params, setParams] = useState<Params>({ token: '', spaceId: '' });

  // Initialize WebSocket connection and handle URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || '';
    const spaceId = urlParams.get('spaceId') || '';
    setParams({ token, spaceId });

    // Initialize WebSocket
    wsRef.current = new WebSocket(WS_URL);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      // Join the space once connected
      wsRef.current?.send(JSON.stringify({
        type: 'join',
        payload: {
          spaceId,
          token
        }
      }));
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (message: { type: string; payload: any }) => {
    switch (message.type) {
      case 'space-joined':
        console.log('Joined space:', message.payload);
        setCurrentUser({
          x: message.payload.spawn.x,
          y: message.payload.spawn.y,
          userId: message.payload.userId || 'self'
        });
        
        // Initialize other users from the payload
        const userMap = new Map<string, User>();
        message.payload.users?.forEach((user: User) => {
          if (user.userId) {
            userMap.set(user.userId, user);
          }
        });
        setUsers(userMap);
        break;

      case 'user-joined':
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.set(message.payload.userId, {
            x: message.payload.x,
            y: message.payload.y,
            userId: message.payload.userId
          });
          return newUsers;
        });
        break;

      case 'movement':
        setUsers(prev => {
          const newUsers = new Map(prev);
          const user = newUsers.get(message.payload.userId);
          if (user) {
            user.x = message.payload.x;
            user.y = message.payload.y;
            newUsers.set(message.payload.userId, { ...user });
          }
          return newUsers;
        });
        break;

      case 'movement-rejected':
        setCurrentUser(prev => prev ? {
          ...prev,
          x: message.payload.x,
          y: message.payload.y
        } : null);
        break;

      case 'user-left':
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.delete(message.payload.userId);
          return newUsers;
        });
        break;
    }
  };

  // Handle user movement
  const handleMove = (newX: number, newY: number) => {
    if (!currentUser || !wsRef.current) return;
    
    // Optimistic update
    setCurrentUser(prev => prev ? { ...prev, x: newX, y: newY } : null);
    
    // Send movement request
    wsRef.current.send(JSON.stringify({
      type: 'move',
      payload: {
        x: newX,
        y: newY,
        userId: currentUser.userId
      }
    }));
  };

  // Draw the arena
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#2d2d44';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw current user
    if (currentUser && currentUser.x !== undefined) {
      const x = currentUser.x * 50 + 25;
      const y = currentUser.y * 50 + 25;
      
      // Glow effect
      ctx.shadowColor = '#FF6B6B';
      ctx.shadowBlur = 20;
      
      ctx.beginPath();
      ctx.fillStyle = '#FF6B6B';
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('You', x, y + 35);
    }

    // Draw other users
    users.forEach(user => {
      if (user.x === undefined) return;
      
      const x = user.x * 50 + 25;
      const y = user.y * 50 + 25;
      
      // Glow effect
      ctx.shadowColor = '#4ECDC4';
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.fillStyle = '#4ECDC4';
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#fff';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(user.userId.slice(0, 8), x, y + 35);
    });
  }, [currentUser, users]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!currentUser) return;

    const { x, y } = currentUser;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        handleMove(x, y - 1);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        handleMove(x, y + 1);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        handleMove(x - 1, y);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        handleMove(x + 1, y);
        break;
    }
  };

  return (
    <div 
      className="p-4" 
      onKeyDown={handleKeyDown} 
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <h1 className="text-2xl font-bold mb-4" style={{ color: '#e2e8f0' }}>
        🌐 2D Metaverse Arena
      </h1>
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          Space ID: {params.spaceId || 'Not connected'}
        </p>
        <p className="text-sm text-gray-500">
          Connected Users: {users.size + (currentUser ? 1 : 0)}
        </p>
      </div>
      <div className="border rounded-lg overflow-hidden" style={{ display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
        />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Use arrow keys or WASD to move your avatar
      </p>
    </div>
  );
};

export default Arena;
