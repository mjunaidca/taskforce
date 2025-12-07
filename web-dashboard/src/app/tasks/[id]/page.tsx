"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { TaskRead, MemberRead, AuditRead } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  CheckSquare,
  Bot,
  User,
  Clock,
  Calendar,
  ChevronRight,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  FileText,
} from "lucide-react"

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = Number(params.id)

  const [task, setTask] = useState<TaskRead | null>(null)
  const [members, setMembers] = useState<MemberRead[]>([])
  const [audit, setAudit] = useState<AuditRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const taskData = await api.getTask(taskId)
        setTask(taskData)

        const [membersData, auditData] = await Promise.all([
          api.getProjectMembers(taskData.project_id),
          api.getTaskAudit(taskId, { limit: 10 }),
        ])
        setMembers(membersData)
        setAudit(auditData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task")
      } finally {
        setLoading(false)
      }
    }

    if (taskId) {
      fetchData()
    }
  }, [taskId])

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return
    try {
      setUpdating(true)
      const updatedTask = await api.updateTaskStatus(task.id, {
        status: newStatus as TaskRead["status"],
      })
      setTask(updatedTask)
      // Refresh audit
      const auditData = await api.getTaskAudit(taskId, { limit: 10 })
      setAudit(auditData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  const handleAssign = async (workerId: string) => {
    if (!task) return
    try {
      setUpdating(true)
      const updatedTask = await api.assignTask(task.id, {
        assignee_id: Number(workerId),
      })
      setTask(updatedTask)
      // Refresh audit
      const auditData = await api.getTaskAudit(taskId, { limit: 10 })
      setAudit(auditData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign task")
    } finally {
      setUpdating(false)
    }
  }

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />
      case "in_progress":
        return <Play className="h-4 w-4" />
      case "review":
        return <Clock className="h-4 w-4" />
      case "blocked":
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || "Task not found"}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/tasks">Back to Tasks</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
              <Badge variant="outline" className={getStatusColor(task.status)}>
                {getStatusIcon(task.status)}
                <span className="ml-1">{task.status.replace("_", " ")}</span>
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Task #{task.id} · Created{" "}
              {new Date(task.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided</p>
              )}
            </CardContent>
          </Card>

          {/* Progress */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completion</span>
                  <span className="text-2xl font-bold">{task.progress_percent}%</span>
                </div>
                <Progress value={task.progress_percent} className="h-3" />
                {task.started_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Play className="h-4 w-4" />
                    Started {new Date(task.started_at).toLocaleString()}
                  </div>
                )}
                {task.completed_at && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Completed {new Date(task.completed_at).toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subtasks</CardTitle>
                <CardDescription>
                  {task.subtasks.length} subtask{task.subtasks.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Subtask
              </Button>
            </CardHeader>
            <CardContent>
              {task.subtasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No subtasks yet</p>
              ) : (
                <div className="space-y-2">
                  {task.subtasks.map((subtask) => (
                    <Link
                      key={subtask.id}
                      href={`/tasks/${subtask.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={getStatusColor(subtask.status)}
                        >
                          {getStatusIcon(subtask.status)}
                        </Badge>
                        <span className="font-medium">{subtask.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {subtask.progress_percent}%
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>Recent actions on this task</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/audit?task=${task.id}`}>View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {audit.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          entry.actor_type === "agent"
                            ? "bg-primary/10"
                            : "bg-muted"
                        }`}
                      >
                        {entry.actor_type === "agent" ? (
                          <Bot className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entry.actor_handle}</span>
                          <span className="text-muted-foreground">{entry.action}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={task.status}
                  onValueChange={handleStatusChange}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assignee</label>
                <Select
                  value={task.assignee_id?.toString() || "unassigned"}
                  onValueChange={handleAssign}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.worker_id} value={member.worker_id.toString()}>
                        <div className="flex items-center gap-2">
                          {member.type === "agent" ? (
                            <Bot className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          <span>{member.name}</span>
                          <span className="text-muted-foreground">{member.handle}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {task.status === "review" && (
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    variant="default"
                    onClick={() => api.approveTask(task.id).then(setTask)}
                    disabled={updating}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      const reason = prompt("Rejection reason:")
                      if (reason) {
                        api.rejectTask(task.id, reason).then(setTask)
                      }
                    }}
                    disabled={updating}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Priority</span>
                <Badge
                  variant="outline"
                  className={
                    task.priority === "critical"
                      ? "bg-destructive/10 text-destructive"
                      : task.priority === "high"
                      ? "bg-warning/10 text-warning"
                      : ""
                  }
                >
                  {task.priority}
                </Badge>
              </div>

              {task.due_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Due Date</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {task.tags.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Created: {new Date(task.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
