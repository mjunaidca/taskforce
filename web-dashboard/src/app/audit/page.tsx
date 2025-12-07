"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { ProjectRead, AuditRead } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Bot,
  User,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Play,
  UserPlus,
  Settings,
  Plus,
  Trash2,
} from "lucide-react"

function AuditContent() {
  const searchParams = useSearchParams()
  const taskIdParam = searchParams.get("task")

  const [projects, setProjects] = useState<ProjectRead[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>("all")

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const projectsData = await api.getProjects()
        setProjects(projectsData)

        // Fetch audit for selected project or all projects
        const allAudit: AuditRead[] = []

        if (taskIdParam) {
          // Fetch audit for specific task
          const taskAudit = await api.getTaskAudit(Number(taskIdParam), { limit: 50 })
          allAudit.push(...taskAudit)
        } else if (selectedProject === "all") {
          // Fetch audit from all projects
          for (const project of projectsData.slice(0, 5)) {
            const projectAudit = await api.getProjectAudit(project.id, { limit: 20 })
            allAudit.push(...projectAudit)
          }
        } else {
          // Fetch audit for specific project
          const projectAudit = await api.getProjectAudit(Number(selectedProject), { limit: 50 })
          allAudit.push(...projectAudit)
        }

        // Sort by date descending
        allAudit.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        setAuditEntries(allAudit)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit log")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedProject, taskIdParam])

  const getActionIcon = (action: string) => {
    if (action.includes("created")) return <Plus className="h-4 w-4" />
    if (action.includes("completed")) return <CheckCircle2 className="h-4 w-4" />
    if (action.includes("started") || action.includes("progress")) return <Play className="h-4 w-4" />
    if (action.includes("assigned")) return <UserPlus className="h-4 w-4" />
    if (action.includes("updated") || action.includes("changed")) return <Settings className="h-4 w-4" />
    if (action.includes("deleted")) return <Trash2 className="h-4 w-4" />
    return <ArrowRight className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes("completed")) return "text-success"
    if (action.includes("created")) return "text-primary"
    if (action.includes("deleted")) return "text-destructive"
    if (action.includes("assigned")) return "text-secondary"
    return "text-muted-foreground"
  }

  const formatDetails = (details: Record<string, unknown>) => {
    if (details.before !== undefined && details.after !== undefined) {
      return `${details.before} → ${details.after}`
    }
    if (details.note) return String(details.note)
    if (details.assignee_handle) return `Assigned to ${details.assignee_handle}`
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Track all actions by humans and AI agents
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      {!taskIdParam && (
        <div className="flex items-center gap-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Full Audit Trail</p>
            <p className="text-sm text-muted-foreground mt-1">
              Every action by humans and AI agents is recorded here. This ensures complete
              accountability and transparency for all work performed in TaskFlow.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            {taskIdParam
              ? `Showing activity for task #${taskIdParam}`
              : `Showing ${auditEntries.length} recent activities`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : auditEntries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No activity yet</h3>
              <p className="text-muted-foreground mt-1">
                Actions will appear here once work begins
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-6">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="relative flex items-start gap-4 pl-12">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-3 h-4 w-4 rounded-full border-2 border-background ${
                        entry.actor_type === "agent" ? "bg-primary" : "bg-muted-foreground"
                      }`}
                    />

                    {/* Content */}
                    <div className="flex-1 bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              entry.actor_type === "agent" ? "bg-primary/10" : "bg-muted"
                            }`}
                          >
                            {entry.actor_type === "agent" ? (
                              <Bot className="h-4 w-4 text-primary" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${
                                  entry.actor_type === "agent" ? "text-primary" : ""
                                }`}
                              >
                                {entry.actor_handle}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  entry.actor_type === "agent"
                                    ? "border-primary/30 text-primary bg-primary/5 text-xs"
                                    : "text-xs"
                                }
                              >
                                {entry.actor_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={getActionColor(entry.action)}>
                                {getActionIcon(entry.action)}
                              </span>
                              <span className="text-sm">{entry.action}</span>
                              <span className="text-sm text-muted-foreground">
                                on {entry.entity_type} #{entry.entity_id}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Details */}
                      {formatDetails(entry.details) && (
                        <div className="mt-2 pl-11 text-sm text-muted-foreground">
                          {formatDetails(entry.details)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AuditLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-72 mt-1" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-[200px]" />
      </div>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-4 py-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full mt-1" />
          </div>
        </CardContent>
      </Card>
      <Card className="card-elevated">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuditPage() {
  return (
    <Suspense fallback={<AuditLoading />}>
      <AuditContent />
    </Suspense>
  )
}
