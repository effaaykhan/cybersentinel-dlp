import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  user: {
    email: string
    role: string
    id: string
  } | null
  accessToken: string | null
  refreshToken: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,

      login: async (email: string, password: string) => {
        // Call real API for authentication
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
        
        try {
          const formData = new URLSearchParams()
          formData.append('username', email.trim())
          formData.append('password', password.trim())

          console.log('Attempting login to:', `${API_URL}/auth/login`)
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
          })

          console.log('Login response status:', response.status, response.statusText)
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Login failed' }))
            console.error('Login error:', errorData)
            throw new Error(errorData.detail || 'Invalid username or password')
          }

          const data = await response.json()
          const { access_token, refresh_token } = data

          // Get user info from token (decode JWT payload)
          let userEmail = email.trim()
          let userRole = 'viewer'
          let userId = 'user-001'

          try {
            // Decode JWT to get user info
            const tokenParts = access_token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]))
              userEmail = payload.email || email.trim()
              userRole = payload.role || 'viewer'
              userId = payload.sub || 'user-001'
            }
          } catch (e) {
            // If token decode fails, use defaults
            console.warn('Could not decode token:', e)
          }

          set({
            isAuthenticated: true,
            accessToken: access_token,
            refreshToken: refresh_token,
            user: {
              email: userEmail,
              role: userRole,
              id: userId,
            },
          })
        } catch (error: any) {
          throw new Error(error.message || 'Login failed. Please check your credentials.')
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
        })
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken })
      },
    }),
    {
      name: 'dlp-auth-v2',
    }
  )
)
