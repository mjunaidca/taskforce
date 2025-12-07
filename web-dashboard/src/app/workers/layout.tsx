"use client"

import { AuthProvider } from "@/components/providers/auth-provider"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function WorkersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <ProtectedRoute>
          <div className="min-h-screen bg-background">
            <Sidebar />
            <div className="pl-64">
              <Header />
              <main className="p-6">{children}</main>
            </div>
          </div>
        </ProtectedRoute>
      </TooltipProvider>
    </AuthProvider>
  )
}
