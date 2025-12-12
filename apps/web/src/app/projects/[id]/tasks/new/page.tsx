"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/providers/auth-provider"
import { api } from "@/lib/api"
import { ProjectRead, MemberRead, TaskPriority, RecurrencePattern, RecurrenceTrigger, RECURRENCE_PATTERNS, RECURRENCE_TRIGGERS } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, CheckSquare, Bot, User, FolderOpen, Repeat } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function NewTaskPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = Number(params.id)
  const { isLoading: authLoading, isAuthenticated } = useAuth()

  const [project, setProject] = useState<ProjectRead | null>(null)
  const [allProjects, setAllProjects] = useState<ProjectRead[]>([])
  const [members, setMembers] = useState<MemberRead[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number>(projectId)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [assigneeId, setAssigneeId] = useState<string>("")
  const [dueDate, setDueDate] = useState("")

  // Recurring task state
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | "">("")
  const [maxOccurrences, setMaxOccurrences] = useState<string>("")
  const [recurrenceTrigger, setRecurrenceTrigger] = useState<RecurrenceTrigger>("on_complete")
  const [cloneSubtasks, setCloneSubtasks] = useState(false)

  useEffect(() => {
    // Wait for auth to be ready before making API calls
    if (authLoading || !isAuthenticated) {
      return
    }

    async function fetchData() {
      try {
        setLoading(true)
        const [projectData, membersData, projectsData] = await Promise.all([
          api.getProject(selectedProjectId),
          api.getProjectMembers(selectedProjectId),
          api.getProjects(),
        ])
        setProject(projectData)
        setMembers(membersData)
        setAllProjects(projectsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedProjectId, authLoading, isAuthenticated])

  const handleProjectChange = (newProjectId: string) => {
    const id = Number(newProjectId)
    setSelectedProjectId(id)
    // Reset assignee when switching projects (members differ per project)
    setAssigneeId("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Title is required")
      return
    }

    // Validate recurring task settings
    if (isRecurring && !recurrencePattern) {
      setError("Please select a recurrence pattern")
      return
    }

    try {
      setSubmitting(true)
      const task = await api.createTask(selectedProjectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignee_id: assigneeId && assigneeId !== "unassigned" ? Number(assigneeId) : undefined,
        due_date: dueDate || undefined,
        // Recurring fields
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring && recurrencePattern ? recurrencePattern : undefined,
        max_occurrences: isRecurring && maxOccurrences ? Number(maxOccurrences) : undefined,
        recurrence_trigger: isRecurring ? recurrenceTrigger : undefined,
        clone_subtasks_on_recur: isRecurring ? cloneSubtasks : undefined,
      })
      router.push(`/tasks/${task.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Card className="card-elevated">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-destructive">{error || "Project not found"}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/projects/${selectedProjectId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {project.name}
        </Link>
      </Button>

      {/* Form */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Create New Task</CardTitle>
              <CardDescription>
                Add a new task to your project
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Project Selector */}
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={selectedProjectId.toString()}
                onValueChange={handleProjectChange}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {allProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{p.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which project this task belongs to
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Add more details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-muted">Low</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Medium</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">High</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Critical</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={submitting}>
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
                        <span className="text-muted-foreground text-xs">{member.handle}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign to a human or AI agent from this project
              </p>
            </div>

            {/* Recurring Task Section */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => {
                    setIsRecurring(checked === true)
                    if (!checked) {
                      setRecurrencePattern("")
                      setMaxOccurrences("")
                    }
                  }}
                  disabled={submitting}
                />
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="isRecurring" className="font-medium cursor-pointer">
                    Make this a recurring task
                  </Label>
                </div>
              </div>

              {isRecurring && (
                <div className="space-y-4 pt-2 pl-6 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="recurrencePattern">Repeat Pattern *</Label>
                    <Select
                      value={recurrencePattern}
                      onValueChange={(v) => setRecurrencePattern(v as RecurrencePattern)}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select how often to repeat" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_PATTERNS.map((pattern) => (
                          <SelectItem key={pattern.value} value={pattern.value}>
                            {pattern.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      When completed, a new task will be created with the next due date
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxOccurrences">Maximum Occurrences</Label>
                    <Input
                      id="maxOccurrences"
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={maxOccurrences}
                      onChange={(e) => setMaxOccurrences(e.target.value)}
                      disabled={submitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for unlimited recurrences
                    </p>
                  </div>

                  {/* Clone Subtasks Option */}
                  <div className="flex items-center space-x-3 pt-2">
                    <Checkbox
                      id="cloneSubtasks"
                      checked={cloneSubtasks}
                      onCheckedChange={(checked) => setCloneSubtasks(checked === true)}
                      disabled={submitting}
                    />
                    <div>
                      <Label htmlFor="cloneSubtasks" className="cursor-pointer">
                        Clone subtasks when recurring
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When enabled, subtasks will be copied to each new occurrence
                      </p>
                    </div>
                  </div>

                  {/* Recurrence Trigger - Coming Soon */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="recurrenceTrigger">When to Create Next</Label>
                    </div>
                    <Select
                      value={recurrenceTrigger}
                      onValueChange={(v) => setRecurrenceTrigger(v as RecurrenceTrigger)}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_TRIGGERS.map((trigger) => (
                          <SelectItem
                            key={trigger.value}
                            value={trigger.value}
                            disabled={trigger.comingSoon}
                          >
                            <div className="flex items-center gap-2">
                              <span>{trigger.label}</span>
                              {trigger.comingSoon && (
                                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {RECURRENCE_TRIGGERS.find(t => t.value === recurrenceTrigger)?.description}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={submitting} className="btn-glow">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Task
              </Button>
              <Button type="button" variant="outline" asChild disabled={submitting}>
                <Link href={`/projects/${selectedProjectId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
