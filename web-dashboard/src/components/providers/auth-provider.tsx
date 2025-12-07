"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { JWTClaims } from "@/types"
import { getSession, initiateLogin, logout as authLogout } from "@/lib/auth"

interface AuthContextType {
  user: JWTClaims | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTClaims | null>(null)
  const [isAuth, setIsAuth] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuth = useCallback(async () => {
    try {
      const session = await getSession()
      setIsAuth(session.authenticated)
      setUser(session.user)
    } catch {
      setIsAuth(false)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const login = () => {
    initiateLogin()
  }

  const logout = () => {
    authLogout()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: isAuth,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
