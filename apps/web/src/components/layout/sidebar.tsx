"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Bot,
  FileText,
  Settings,
  Zap,
  Sparkles,
  Network,
  Menu,
  X
} from "lucide-react"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Workspace", href: "/workspace", icon: Sparkles, badge: "AI" },
  { name: "Connect", href: "/dashboard/connect", icon: Network },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Workers", href: "/workers", icon: Users },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Audit Log", href: "/audit", icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button - Fixed top left */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden h-10 w-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen w-16 border-r border-border bg-background/95 backdrop-blur-xl flex flex-col items-center py-4 transition-transform duration-300",
        "md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      {/* Logo */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6 group cursor-pointer hover:bg-primary/20 transition-all">
        <Zap className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-3 w-full px-1.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard")

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-all duration-300 group",
                isActive
                  ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
              title={item.name}
            >
              <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive && "animate-pulse-slow")} />

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-l-full" />
              )}

              {/* Tooltip */}
              <div className="absolute left-12 bg-popover text-popover-foreground px-2.5 py-1 rounded-md text-xs font-mono font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-lg border border-border">
                {item.name}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-1.5 flex flex-col items-center">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </aside>
    </>
  )
}
