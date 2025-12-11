"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { api } from "@/lib/api"
import { ProjectRead, TaskListItem } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FolderKanban,
  CheckSquare,
  Users,
  Bot,
  ArrowRight,
  Sparkles,
  Zap,
  Command,
  Mic,
  Terminal,
  X,
  ArrowRight as ArrowRightIcon
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// IFK Glass Card Component
function GlassCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-black/40 backdrop-blur-md border border-ifk-gray-800 rounded-2xl overflow-hidden hover:border-ifk-cyan-500/30 transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRead[]>([])
  const [recentTasks, setRecentTasks] = useState<TaskListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Command Control State
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        // Fetch projects and recent tasks in parallel
        const [projectsData, tasksData] = await Promise.all([
          api.getProjects({ limit: 5 }),
          api.getRecentTasks(10), // Recent tasks from ALL projects (optimized single query)
        ])
        setProjects(projectsData)
        setRecentTasks(tasksData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const stats = [
    {
      name: "Total Projects",
      value: projects.length,
      icon: FolderKanban,
      color: "text-ifk-cyan-500",
      bgColor: "bg-ifk-cyan-500/10",
    },
    {
      name: "Active Tasks",
      value: projects.reduce((acc, p) => acc + p.task_count, 0),
      icon: CheckSquare,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      name: "Team Members",
      value: projects.reduce((acc, p) => acc + p.member_count, 0),
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      name: "AI Agents",
      value: "ACTIVE", // Hardcoded for now to match workspace vibe
      icon: Bot,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/30"
      case "in_progress":
        return "bg-primary/10 text-primary border-primary/30"
      case "review":
        return "bg-warning/10 text-warning border-warning/30"
      case "blocked":
        return "bg-destructive/10 text-destructive border-destructive/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-8 min-h-screen pb-20">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white">
            Welcome back, <span className="text-ifk-cyan-400">{user?.name?.split(" ")[0] || "Commander"}</span>
          </h1>
          <p className="text-ifk-gray-400 mt-1 font-mono text-sm">
            System Operational. Ready for orders.
          </p>
        </div>
        <Button asChild className="bg-ifk-cyan-500 hover:bg-ifk-cyan-400 text-black border-none font-bold">
          <Link href="/projects/new">
            New Project
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard key={stat.name} className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-mono text-ifk-gray-400 mb-1">{stat.name}</p>
              {loading ? (
                <Skeleton className="h-8 w-16 bg-ifk-gray-800" />
              ) : (
                <div className="text-2xl font-bold font-display tracking-wide">{stat.value}</div>
              )}
            </div>
            <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center border border-white/5`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <GlassCard className="flex flex-col">
          <div className="p-6 border-b border-ifk-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display tracking-wide">Active Projects</h2>
              <p className="text-xs text-ifk-gray-500 font-mono mt-1">LATEST DEVELOPMENTS</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-ifk-cyan-400 hover:text-white hover:bg-ifk-cyan-900/20">
              <Link href="/projects">
                VIEW ALL
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-ifk-gray-800" />
                ))}
              </div>
            ) : error ? (
              <p className="text-red-400 text-sm font-mono">{error}</p>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="h-12 w-12 mx-auto text-ifk-gray-800 mb-4" />
                <p className="text-ifk-gray-500 font-mono text-sm">No projects initialized.</p>
                <Button variant="outline" size="sm" className="mt-4 border-ifk-gray-700 text-ifk-gray-300 hover:text-white hover:border-ifk-cyan-500" asChild>
                  <Link href="/projects/new">Initialize Project</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-ifk-gray-800/50 bg-black/20 hover:border-ifk-cyan-500/30 hover:bg-ifk-cyan-900/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-ifk-cyan-900/20 flex items-center justify-center border border-ifk-cyan-500/20 group-hover:border-ifk-cyan-500/50">
                        <FolderKanban className="h-5 w-5 text-ifk-cyan-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm group-hover:text-ifk-cyan-400 transition-colors">{project.name}</p>
                        <p className="text-xs text-ifk-gray-500 font-mono mt-0.5">
                          {project.task_count} TASKS · {project.member_count} MBRS
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ifk-gray-600 group-hover:text-ifk-cyan-500 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Recent Tasks */}
        <GlassCard className="flex flex-col">
          <div className="p-6 border-b border-ifk-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display tracking-wide">Priority Tasks</h2>
              <p className="text-xs text-ifk-gray-500 font-mono mt-1">PENDING ACTIONS</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-ifk-cyan-400 hover:text-white hover:bg-ifk-cyan-900/20">
              <Link href="/tasks">
                VIEW ALL
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-ifk-gray-800" />
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckSquare className="h-12 w-12 mx-auto text-ifk-gray-800 mb-4" />
                <p className="text-ifk-gray-500 font-mono text-sm">No pending tasks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-ifk-gray-800/50 bg-black/20 hover:border-emerald-500/30 hover:bg-emerald-900/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-ifk-gray-900 flex items-center justify-center border border-ifk-gray-800 group-hover:border-emerald-500/30">
                        <CheckSquare className="h-5 w-5 text-ifk-gray-400 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-200 group-hover:text-white transition-colors">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`font-mono text-[10px] uppercase border-0 ${getStatusColor(task.status)}`}>
                            {task.status.replace("_", " ")}
                          </Badge>
                          {task.assignee_handle && (
                            <span className="text-[10px] text-ifk-gray-500 font-mono">
                              @{task.assignee_handle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wide mb-1">Quick Actions</h2>
          <p className="text-xs text-ifk-gray-500 font-mono mb-6">RAPID DEPLOYMENT PROTOCOLS</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Button variant="outline" className="h-auto py-6 flex-col gap-3 bg-black/50 border-ifk-gray-800 hover:bg-ifk-cyan-900/20 hover:border-ifk-cyan-500/50 hover:text-ifk-cyan-400 transition-all group" asChild>
            <Link href="/projects/new">
              <FolderKanban className="h-6 w-6 text-gray-400 group-hover:text-ifk-cyan-500 group-hover:scale-110 transition-all" />
              <span className="font-mono text-xs tracking-wider">INIT PROJECT</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex-col gap-3 bg-black/50 border-ifk-gray-800 hover:bg-amber-900/20 hover:border-amber-500/50 hover:text-amber-400 transition-all group" asChild>
            <Link href="/agents/new">
              <Bot className="h-6 w-6 text-gray-400 group-hover:text-amber-500 group-hover:scale-110 transition-all" />
              <span className="font-mono text-xs tracking-wider">DEPLOY AGENT</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex-col gap-3 bg-black/50 border-ifk-gray-800 hover:bg-purple-900/20 hover:border-purple-500/50 hover:text-purple-400 transition-all group" asChild>
            <Link href="/audit">
              <Sparkles className="h-6 w-6 text-gray-400 group-hover:text-purple-500 group-hover:scale-110 transition-all" />
              <span className="font-mono text-xs tracking-wider">VIEW AUDIT LOG</span>
            </Link>
          </Button>
        </div>
      </GlassCard>

      {/* Persistent Command Control (Voice & Type) - Fixed Bottom Right */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">

        {/* Manual Input Overlay (Slide in) */}
        {showInput && (
          <div className="bg-black/80 backdrop-blur-xl border border-ifk-gray-700 rounded-xl p-2 mb-2 shadow-2xl animate-in slide-in-from-right-4 fade-in flex items-center gap-2 w-80">
            <input
              ref={inputRef}
              type="text"
              placeholder="Command Protocol..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder:text-gray-500 px-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLInputElement;
                  if (target.value.trim()) {
                    router.push(`/workspace?prompt=${encodeURIComponent(target.value.trim())}`);
                  }
                }
              }}
            />
            <button
              onClick={() => setShowInput(false)}
              className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md p-2 rounded-full border border-ifk-gray-800/50 shadow-2xl">
          {/* Terminal Toggle */}
          <button
            onClick={() => setShowInput(!showInput)}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${showInput
              ? 'bg-ifk-cyan-500/20 text-ifk-cyan-400 border border-ifk-cyan-500/50'
              : 'bg-ifk-gray-900/50 text-ifk-gray-400 hover:text-white hover:bg-ifk-gray-800 border border-transparent'
              }`}
            title="Manual Input"
          >
            <Terminal className="h-5 w-5" />
          </button>


        </div>
      </div>
    </div>
  )
}
