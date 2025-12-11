"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { api } from "@/lib/api"
import { ProjectRead, TaskListItem, WorkerRead } from "@/types"
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
        "bg-background/40 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300",
        "dark:bg-black/40 dark:border-ifk-gray-800 dark:hover:border-ifk-cyan-500/30",
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
  const [workers, setWorkers] = useState<WorkerRead[]>([])
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
        // Fetch projects, recent tasks, and workers in parallel
        const [projectsData, tasksData, workersData] = await Promise.all([
          api.getProjects({ limit: 5 }),
          api.getRecentTasks(10),
          api.getAgents(),
        ])
        setProjects(projectsData)
        setRecentTasks(tasksData)
        setWorkers(workersData)
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
      name: "Total Workers",
      value: workers.length,
      icon: Users, // Using Users icon since it includes both humans and agents
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ]



  // Terminal Log Component
  const TerminalLog = ({ logs }: { logs: TaskListItem[] }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
      <div className="bg-black/90 rounded-lg p-4 h-[300px] overflow-y-auto font-mono text-xs border border-ifk-gray-800 shadow-inner custom-scrollbar relative">
        <div className="absolute top-2 right-2 flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500/50" />
          <div className="h-2 w-2 rounded-full bg-amber-500/50" />
          <div className="h-2 w-2 rounded-full bg-emerald-500/50" />
        </div>
        <div className="space-y-1.5 mt-4">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">:: System initialized. Waiting for event stream...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2 hover:bg-white/5 p-0.5 rounded cursor-pointer group transition-colors" role="button" onClick={() => router.push(`/tasks/${log.id}`)}>
                <span className="text-emerald-500 shrank-0">➜</span>
                <span className="text-ifk-cyan-400 shrank-0">[{log.status.toUpperCase()}]</span>
                <span className="text-gray-300 group-hover:text-white transition-colors truncate flex-1">{log.title}</span>
                {log.assignee_handle && <span className="text-amber-500 opacity-50">@{log.assignee_handle}</span>}
              </div>
            ))
          )}
          <div className="flex gap-2 animate-pulse mt-2">
            <span className="text-emerald-500">➜</span>
            <span className="text-gray-400">_</span>
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 min-h-screen pb-20">
      <div className="flex-1 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-display font-medium tracking-tight text-foreground">
            Welcome back, <span className="text-primary">{user?.name?.split(" ")[0] || "Pilot"}</span>
          </h1>
          <p className="text-muted-foreground font-mono text-sm max-w-xl">
            System operational. {projects.length} active neural networks detected.
            {recentTasks.length > 0 ? ` ${recentTasks.length} pending directives.` : " Awaiting new protocols."}
          </p>
        </div>
        <Button asChild className="bg-ifk-cyan-500 hover:bg-ifk-cyan-400 text-black border-none font-bold">
          <Link href="/projects/new">
            New Project
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Getting Started Guide - Show for new users */}
      {!loading && projects.length === 0 && (
        <GlassCard className="p-6 border-2 border-dashed border-ifk-cyan-500/30">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-ifk-cyan-500/10 rounded-xl">
              <Sparkles className="h-6 w-6 text-ifk-cyan-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold font-display mb-2">Chat with TaskFlow Agent</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Use natural language to manage your work. The TaskFlow Agent can help you with:
              </p>
              <div className="grid gap-2 md:grid-cols-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-ifk-cyan-500">●</span> Create Projects and Plan Tasks
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-ifk-cyan-500">●</span> Add Tasks with Subtasks
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-ifk-cyan-500">●</span> View Complete Audit Trails
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-ifk-cyan-500">●</span> Create Organizations & Add Users
                </div>
              </div>
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ifk-cyan-500/20 hover:bg-ifk-cyan-500/30 text-ifk-cyan-400 font-medium text-sm transition-colors border border-ifk-cyan-500/30"
              >
                <Sparkles className="h-4 w-4" />
                Open TaskFlow Agent
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard key={stat.name} className="p-4 flex items-center justify-between group">
            <div>
              <p className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {stat.name}
              </p>
              <div className="text-2xl font-bold font-display text-foreground group-hover:scale-105 transition-transform origin-left">
                {stat.value}
              </div>
            </div>
            <div className={cn("p-2 rounded-lg transition-colors", stat.bgColor)}>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
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
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{project.name}</span>
                        {!!project.is_shared && <Users className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" /> {project.task_count}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {project.member_count}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 duration-300" />
                  </Link>
                ))}
              </div>
            )}
            {/* View All Projects Link */}
            <div className="p-3 border-t border-border/50">
              <Link
                href="/projects"
                className="flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
              >
                VIEW ALL PROJECTS
                <ArrowRightIcon className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </GlassCard>

        {/* Recent Tasks (Terminal Style) */}
        <GlassCard className="flex flex-col">
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display tracking-wide text-foreground">System Logs</h2>
              <p className="text-xs text-muted-foreground font-mono mt-1">LIVE EVENT STREAM</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/10">ONLINE</Badge>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg bg-muted/20" />
            ) : (
              <TerminalLog logs={recentTasks} />
            )}

            <div className="pt-4 mt-2 flex justify-end">
              <Link href="/tasks" className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                FULL AUDIT LOG <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
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
          <Button variant="outline" className="h-auto py-6 flex-col gap-3 bg-secondary/10 border-border hover:bg-ifk-cyan-900/20 hover:border-ifk-cyan-500/50 hover:text-ifk-cyan-400 dark:hover:text-ifk-cyan-300 transition-all group" asChild>
            <Link href="/projects/new">
              <FolderKanban className="h-6 w-6 text-muted-foreground group-hover:text-ifk-cyan-500 group-hover:scale-110 transition-all" />
              <span className="font-mono text-xs tracking-wider text-foreground group-hover:text-ifk-cyan-400">INIT PROJECT</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex-col gap-3 bg-secondary/10 border-border hover:bg-amber-500/10 hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400 transition-all group" asChild>
            <Link href="/agents/new">
              <Bot className="h-6 w-6 text-muted-foreground group-hover:text-amber-500 group-hover:scale-110 transition-all" />
              <span className="font-mono text-xs tracking-wider text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400">DEPLOY AGENT</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex-col gap-3 bg-secondary/10 border-border hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-600 dark:hover:text-purple-400 transition-all group" asChild>
            <Link href="/audit">
              <Sparkles className="h-6 w-6 text-muted-foreground group-hover:text-purple-500 group-hover:scale-110 transition-all" />
              <span className="font-mono text-xs tracking-wider text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400">VIEW AUDIT LOG</span>
            </Link>
          </Button>
        </div>
      </GlassCard>

      {/* Persistent Command Control - Fixed Bottom Right */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">

        {/* Command Input Overlay (Slide in) */}
        {showInput && (
          <div className="bg-ifk-gray-950 backdrop-blur-xl border border-ifk-cyan-500/30 rounded-xl p-3 mb-2 shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-in slide-in-from-right-4 fade-in w-96">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-ifk-cyan-500" />
              <span className="text-xs font-mono text-ifk-cyan-400 uppercase tracking-wider">TaskFlow Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask anything... (Press Enter to send)"
                className="flex-1 bg-black/50 border border-ifk-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-ifk-gray-500 focus:border-ifk-cyan-500/50 focus:outline-none transition-colors"
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
                className="p-2 hover:bg-ifk-gray-800 rounded-lg text-ifk-gray-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-ifk-gray-500 mt-2 font-mono">
              Press Enter to open full workspace with your message
            </p>
          </div>
        )}

        {/* Terminal Toggle Button */}
        <button
          onClick={() => setShowInput(!showInput)}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all shadow-lg ${showInput
            ? 'bg-ifk-cyan-500/20 text-ifk-cyan-400 border-2 border-ifk-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            : 'bg-ifk-gray-900 text-ifk-gray-400 hover:text-ifk-cyan-400 hover:bg-ifk-gray-800 border border-ifk-gray-700 hover:border-ifk-cyan-500/30'
            }`}
          title="Quick Command"
        >
          <Terminal className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
