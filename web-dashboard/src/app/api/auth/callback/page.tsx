"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { handleCallback, initiateLogin } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

type AuthStatus = "loading" | "success" | "error" | "no-code"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get("code")
    const errorParam = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Handle OAuth error response
    if (errorParam) {
      setStatus("error")
      setError(errorDescription || errorParam)
      return
    }

    // No code - initiate login
    if (!code) {
      setStatus("no-code")
      // Auto-initiate login after a brief delay
      const timer = setTimeout(() => {
        initiateLogin()
      }, 1500)
      return () => clearTimeout(timer)
    }

    // Exchange code for tokens
    handleCallback(code)
      .then(() => {
        setStatus("success")
        // Redirect to dashboard after brief success message
        setTimeout(() => {
          router.push("/dashboard")
        }, 1000)
      })
      .catch((err) => {
        setStatus("error")
        setError(err.message || "Authentication failed")
      })
  }, [searchParams, router])

  return (
    <Card className="w-full max-w-md card-elevated">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {status === "loading" && (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Authenticating
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-5 w-5 text-success" />
              Success!
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="h-5 w-5 text-destructive" />
              Authentication Failed
            </>
          )}
          {status === "no-code" && (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Redirecting to Login
            </>
          )}
        </CardTitle>
        <CardDescription>
          {status === "loading" && "Exchanging authorization code..."}
          {status === "success" && "Redirecting to dashboard..."}
          {status === "error" && error}
          {status === "no-code" && "Preparing SSO authentication..."}
        </CardDescription>
      </CardHeader>

      {status === "error" && (
        <CardContent className="flex flex-col gap-4">
          <Button onClick={() => initiateLogin()} className="w-full btn-glow">
            Try Again
          </Button>
          <Button variant="outline" onClick={() => router.push("/")} className="w-full">
            Back to Home
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

function AuthCallbackLoading() {
  return (
    <Card className="w-full max-w-md card-elevated">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading
        </CardTitle>
        <CardDescription>Preparing authentication...</CardDescription>
      </CardHeader>
    </Card>
  )
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background ifk-atmosphere p-4">
      <div className="ifk-grid-fade absolute inset-0 -z-10" />
      <Suspense fallback={<AuthCallbackLoading />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  )
}
