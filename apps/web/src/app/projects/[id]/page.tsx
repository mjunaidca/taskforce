"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { ProjectRead, MemberRead, TaskListItem, WorkerRead } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Plus,
  Users,
  Bot,
  User,
  CheckSquare,
  Settings,
  MoreHorizontal,
  Loader2,
  X,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = Number(params.id)

  const [project, setProject] = useState<ProjectRead | null>(null)
  const [members, setMembers] = useState<MemberRead[]>([])
  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [agents, setAgents] = useState<WorkerRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add member dialog state
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addAgentOpen, setAddAgentOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [humanUserId, setHumanUserId] = useState("")
  const [addingMember, setAddingMember] = useState(false)
  const [addMemberError, setAddMemberError] = useState<string | null>(null)

  // Delete task state
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null)
  const [deleteTaskTitle, setDeleteTaskTitle] = useState<string>("")
  const [deletingTask, setDeletingTask] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [projectData, membersData, tasksData, agentsData] = await Promise.all([
        api.getProject(projectId),
        api.getProjectMembers(projectId),
        api.getProjectTasks(projectId, { limit: 10 }),
        api.getAgents(),
      ])
      setProject(projectData)
      setMembers(membersData)
      setTasks(tasksData)
      setAgents(agentsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  const handleAddHumanMember = async () => {
    if (!humanUserId.trim()) {
      setAddMemberError("SSO User ID is required")
      return
    }

    try {
      setAddingMember(true)
      setAddMemberError(null)
      await api.addProjectMember(projectId, {
        user_id: humanUserId.trim(),
      })
      setAddMemberOpen(false)
      setHumanUserId("")
      // Refresh members
      const newMembers = await api.getProjectMembers(projectId)
      setMembers(newMembers)
    } catch (err) {
      setAddMemberError(err instanceof Error ? err.message : "Failed to add member")
    } finally {
      setAddingMember(false)
    }
  }

  const handleAddAgentMember = async () => {
    if (!selectedAgentId) {
      setAddMemberError("Please select an agent")
      return
    }

    const agent = agents.find((a) => a.id === Number(selectedAgentId))
    if (!agent) {
      setAddMemberError("Agent not found")
      return
    }

    try {
      setAddingMember(true)
      setAddMemberError(null)
      await api.addProjectMember(projectId, {
        agent_id: agent.id,
      })
      setAddAgentOpen(false)
      setSelectedAgentId("")
      // Refresh members
      const newMembers = await api.getProjectMembers(projectId)
      setMembers(newMembers)
    } catch (err) {
      setAddMemberError(err instanceof Error ? err.message : "Failed to add agent")
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: number) => {
    try {
      await api.removeProjectMember(projectId, memberId)
      const newMembers = await api.getProjectMembers(projectId)
      setMembers(newMembers)
    } catch (err) {
      console.error("Failed to remove member:", err)
    }
  }

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return
    try {
      setDeletingTask(true)
      await api.deleteTask(deleteTaskId)
      setTasks(tasks.filter((t) => t.id !== deleteTaskId))
      setDeleteTaskId(null)
      setDeleteTaskTitle("")
    } catch (err) {
      console.error("Failed to delete task:", err)
    } finally {
      setDeletingTask(false)
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/30"
      case "high":
        return "bg-warning/10 text-warning border-warning/30"
      case "medium":
        return "bg-primary/10 text-primary border-primary/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  // Filter out agents that are already members
  const availableAgents = agents.filter(
    (agent) => !members.some((m) => m.handle === agent.handle)
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || "Project not found"}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  const humanMembers = members.filter((m) => m.type === "human")
  const agentMembers = members.filter((m) => m.type === "agent")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{project.name}</h1>
              {project.is_default && <Badge variant="outline">Default</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base truncate">{project.description || project.slug}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:ml-14">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href={`/projects/${project.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button asChild className="btn-glow w-full sm:w-auto">
            <Link href={`/projects/${project.id}/tasks/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Members Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Human Members */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>{humanMembers.length} humans</CardDescription>
            </div>
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Add a human team member to this project
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {addMemberError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                      {addMemberError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="humanUserId">SSO User ID</Label>
                    <Input
                      id="humanUserId"
                      placeholder="Enter the user's SSO ID"
                      value={humanUserId}
                      onChange={(e) => setHumanUserId(e.target.value)}
                      disabled={addingMember}
                    />
                    <p className="text-xs text-muted-foreground">
                      The user must have an account in TaskFlow SSO. Their worker profile will be created automatically.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddMemberOpen(false)} disabled={addingMember}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddHumanMember} disabled={addingMember}>
                    {addingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {humanMembers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No human members yet</p>
            ) : (
              <div className="space-y-3">
                {humanMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.handle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{member.role}</Badge>
                      {member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Members */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI Agents
              </CardTitle>
              <CardDescription>{agentMembers.length} agents</CardDescription>
            </div>
            <Dialog open={addAgentOpen} onOpenChange={setAddAgentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Agent
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add AI Agent</DialogTitle>
                  <DialogDescription>
                    Add a registered AI agent to this project
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {addMemberError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                      {addMemberError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="agentSelect">Select Agent</Label>
                    <Select value={selectedAgentId} onValueChange={setSelectedAgentId} disabled={addingMember}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAgents.length === 0 ? (
                          <SelectItem value="" disabled>
                            No available agents
                          </SelectItem>
                        ) : (
                          availableAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-primary" />
                                <span>{agent.name}</span>
                                <span className="text-muted-foreground text-xs">{agent.handle}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {availableAgents.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        <Link href="/agents/new" className="text-primary hover:underline">
                          Register a new agent
                        </Link>{" "}
                        to add one to this project.
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddAgentOpen(false)} disabled={addingMember}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddAgentMember} disabled={addingMember || !selectedAgentId}>
                    {addingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Agent
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {agentMembers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No AI agents assigned yet</p>
            ) : (
              <div className="space-y-3">
                {agentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-primary">{member.handle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {member.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks Section */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Tasks
            </CardTitle>
            <CardDescription>{project.task_count} total tasks</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/tasks?project=${project.id}`}>View All</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <div className="p-8 text-center">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No tasks yet</p>
              <Button className="mt-4" asChild>
                <Link href={`/projects/${project.id}/tasks/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Task
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Priority</TableHead>
                  <TableHead className="hidden md:table-cell">Assignee</TableHead>
                  <TableHead className="hidden lg:table-cell">Progress</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className="group">
                    <TableCell>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {task.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(task.status)}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {task.assignee_handle ? (
                        <span className="text-sm">{task.assignee_handle}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${task.progress_percent}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {task.progress_percent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks/${task.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks/${task.id}?edit=true`}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setDeleteTaskId(task.id)
                              setDeleteTaskTitle(task.title)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={deleteTaskId !== null} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTaskTitle}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTask}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingTask}
            >
              {deletingTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
