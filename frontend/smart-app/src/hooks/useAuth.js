import { useState, useEffect } from 'react'
import { userManager } from '../config/auth'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try to load user from localStorage first
    const storedUser = localStorage.getItem('mithram_user')
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      // Check if the token is expired
      if (parsedUser.expiresAt * 1000 > Date.now()) {
        setUser(parsedUser)
      } else {
        localStorage.removeItem('mithram_user')
      }
    }
    setLoading(false)

    // Add event listeners for user changes
    const handleUserLoaded = (user) => {
      console.log("User loaded:", user)
      setUser({
        accessToken: user.access_token,
        refreshToken: user.refresh_token,
        profile: user.profile,
        scope: user.scope,
        expiresAt: user.expires_at
      })
    }

    const handleUserUnloaded = () => {
      console.log("User unloaded")
      setUser(null)
      localStorage.removeItem('mithram_user')
    }

    userManager.events.addUserLoaded(handleUserLoaded)
    userManager.events.addUserUnloaded(handleUserUnloaded)

    return () => {
      userManager.events.removeUserLoaded(handleUserLoaded)
      userManager.events.removeUserUnloaded(handleUserUnloaded)
    }
  }, [])

  const logout = async () => {
    try {
      await userManager.signoutRedirect()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const getAccessToken = () => {
    if (!user) return null
    if (user.expiresAt * 1000 <= Date.now()) {
      localStorage.removeItem('mithram_user')
      setUser(null)
      return null
    }
    return user.accessToken
  }

  return {
    user,
    loading,
    logout,
    getAccessToken,
    isAuthenticated: !!user && user.expiresAt * 1000 > Date.now()
  }
}
