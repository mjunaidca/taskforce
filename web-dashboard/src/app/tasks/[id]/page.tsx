"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { TaskRead, MemberRead, AuditRead, TaskPriority } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Bot,
  User,
  Clock,
  Calendar,
  ChevronRight,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  FileText,
  Loader2,
  Pencil,
  Trash2,
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

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium")
  const [editDueDate, setEditDueDate] = useState("")
  const [editTags, setEditTags] = useState("")
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete state
  const [deleting, setDeleting] = useState(false)

  // Subtask dialog state
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState("")
  const [subtaskDescription, setSubtaskDescription] = useState("")
  const [subtaskPriority, setSubtaskPriority] = useState<TaskPriority>("medium")
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState<string>("")
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subtaskError, setSubtaskError] = useState<string | null>(null)

  const fetchData = async () => {
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

  useEffect(() => {
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
    // Skip if selecting "unassigned" - would need unassign API endpoint
    if (workerId === "unassigned") return
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

  const handleAddSubtask = async () => {
    if (!task || !subtaskTitle.trim()) {
      setSubtaskError("Title is required")
      return
    }

    try {
      setAddingSubtask(true)
      setSubtaskError(null)
      await api.createSubtask(task.id, {
        title: subtaskTitle.trim(),
        description: subtaskDescription.trim() || undefined,
        priority: subtaskPriority,
        assignee_id: subtaskAssigneeId ? Number(subtaskAssigneeId) : undefined,
      })
      setSubtaskDialogOpen(false)
      setSubtaskTitle("")
      setSubtaskDescription("")
      setSubtaskPriority("medium")
      setSubtaskAssigneeId("")
      // Refresh task to get updated subtasks
      const updatedTask = await api.getTask(taskId)
      setTask(updatedTask)
      // Refresh audit
      const auditData = await api.getTaskAudit(taskId, { limit: 10 })
      setAudit(auditData)
    } catch (err) {
      setSubtaskError(err instanceof Error ? err.message : "Failed to create subtask")
    } finally {
      setAddingSubtask(false)
    }
  }

  const openEditDialog = () => {
    if (!task) return
    setEditTitle(task.title)
    setEditDescription(task.description || "")
    setEditPriority(task.priority)
    setEditDueDate(task.due_date ? task.due_date.split("T")[0] : "")
    setEditTags(task.tags.join(", "))
    setEditError(null)
    setEditDialogOpen(true)
  }

  const handleEditTask = async () => {
    if (!task) return
    if (!editTitle.trim()) {
      setEditError("Title is required")
      return
    }

    try {
      setSaving(true)
      setEditError(null)
      const updatedTask = await api.updateTask(task.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
        due_date: editDueDate || undefined,
        tags: editTags ? editTags.split(",").map(t => t.trim()).filter(Boolean) : [],
      })
      setTask(updatedTask)
      setEditDialogOpen(false)
      // Refresh audit
      const auditData = await api.getTaskAudit(taskId, { limit: 10 })
      setAudit(auditData)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update task")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return
    try {
      setDeleting(true)
      await api.deleteTask(task.id)
      router.push(`/projects/${task.project_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task")
      setDeleting(false)
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
                  {task.subtasks.length > 0 && (
                    <span className="block mt-2 text-warning">
                      Warning: This task has {task.subtasks.length} subtask(s) that will also be deleted.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTask}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {editError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="editTitle">Title *</Label>
              <Input
                id="editTitle"
                placeholder="Task title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={saving}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <textarea
                id="editDescription"
                placeholder="Task description..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={saving}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPriority">Priority</Label>
                <Select value={editPriority} onValueChange={(v) => setEditPriority(v as TaskPriority)} disabled={saving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDueDate">Due Date</Label>
                <Input
                  id="editDueDate"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTags">Tags</Label>
              <Input
                id="editTags"
                placeholder="Comma-separated tags (e.g., bug, frontend, urgent)"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple tags with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleEditTask} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Dialog open={subtaskDialogOpen} onOpenChange={setSubtaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subtask
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Subtask</DialogTitle>
                    <DialogDescription>
                      Create a new subtask for &quot;{task.title}&quot;
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {subtaskError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                        {subtaskError}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="subtaskTitle">Title *</Label>
                      <Input
                        id="subtaskTitle"
                        placeholder="What needs to be done?"
                        value={subtaskTitle}
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                        disabled={addingSubtask}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subtaskDescription">Description</Label>
                      <textarea
                        id="subtaskDescription"
                        placeholder="Add details..."
                        value={subtaskDescription}
                        onChange={(e) => setSubtaskDescription(e.target.value)}
                        disabled={addingSubtask}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subtaskPriority">Priority</Label>
                        <Select value={subtaskPriority} onValueChange={(v) => setSubtaskPriority(v as TaskPriority)} disabled={addingSubtask}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subtaskAssignee">Assignee</Label>
                        <Select value={subtaskAssigneeId || "unassigned"} onValueChange={(v) => setSubtaskAssigneeId(v === "unassigned" ? "" : v)} disabled={addingSubtask}>
                          <SelectTrigger>
                            <SelectValue placeholder="Unassigned" />
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
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSubtaskDialogOpen(false)} disabled={addingSubtask}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddSubtask} disabled={addingSubtask}>
                      {addingSubtask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Subtask
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
