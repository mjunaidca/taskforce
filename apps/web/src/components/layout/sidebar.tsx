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
  Network
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Workspace", href: "/workspace", icon: Sparkles, badge: "AI" },
  { name: "Connect", href: "/dashboard/connect", icon: Network }, // MCP Manifestor
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Workers", href: "/workers", icon: Users },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Audit Log", href: "/audit", icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-20 border-r border-border bg-background/50 backdrop-blur-xl flex flex-col items-center py-4">
      {/* Logo */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6 group cursor-pointer hover:bg-primary/20 transition-all">
        <Zap className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 w-full px-2">
        {navigation.map((item) => {
          // Check exact match for root or subpaths
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard")

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex items-center justify-center h-12 w-12 mx-auto rounded-xl transition-all duration-300 group",
                isActive
                  ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
              title={item.name}
            >
              <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive && "animate-pulse-slow")} />

              {/* Active Indicator (Dot) */}
              {isActive && (
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l-full blur-[1px]" />
              )}

              {/* Tooltip (Custom) */}
              <div className="absolute left-14 bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-xs font-mono font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-border">
                {item.name}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-2 space-y-4 flex flex-col items-center">
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </aside>
  )
}
