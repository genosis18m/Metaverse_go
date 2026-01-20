import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface OAuthCallbackProps {
  onLogin: (token: string, userId: string) => void
}

export default function OAuthCallback({ onLogin }: OAuthCallbackProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const userId = searchParams.get('userId')
    const error = searchParams.get('error')

    if (error) {
      navigate('/?error=' + error)
      return
    }

    if (token && userId) {
      onLogin(token, userId)
      navigate('/dashboard')
    } else {
      navigate('/?error=oauth_failed')
    }
  }, [searchParams, onLogin, navigate])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: '#e2e8f0'
    }}>
      <p>Signing you in...</p>
    </div>
  )
}
