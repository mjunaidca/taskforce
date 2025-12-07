"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { JWTClaims } from "@/types"
import {
  checkAuthStatus,
  getCurrentUser,
  isAuthenticated,
  logout as authLogout,
  initiateLogin,
} from "@/lib/auth"

interface AuthContextType {
  user: JWTClaims | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTClaims | null>(null)
  const [isAuth, setIsAuth] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check auth status on mount
    checkAuthStatus().then((authenticated) => {
      setIsAuth(authenticated)
      if (authenticated) {
        setUser(getCurrentUser())
      }
      setIsLoading(false)
    })
  }, [])

  const login = () => {
    initiateLogin()
  }

  const logout = () => {
    authLogout()
    setUser(null)
    setIsAuth(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: isAuth,
        isLoading,
        login,
        logout,
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
