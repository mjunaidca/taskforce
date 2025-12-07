"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { ProjectRead, MemberRead, TaskListItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Plus,
  Users,
  Bot,
  User,
  CheckSquare,
  Settings,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = Number(params.id)

  const [project, setProject] = useState<ProjectRead | null>(null)
  const [members, setMembers] = useState<MemberRead[]>([])
  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [projectData, membersData, tasksData] = await Promise.all([
          api.getProject(projectId),
          api.getProjectMembers(projectId),
          api.getProjectTasks(projectId, { limit: 10 }),
        ])
        setProject(projectData)
        setMembers(membersData)
        setTasks(tasksData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project")
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchData()
    }
  }, [projectId])

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              {project.is_default && <Badge variant="outline">Default</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">{project.description || project.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/projects/${project.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button asChild className="btn-glow">
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
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </CardHeader>
          <CardContent>
            {humanMembers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No human members yet</p>
            ) : (
              <div className="space-y-3">
                {humanMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
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
                    <Badge variant="outline">{member.role}</Badge>
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
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Agent
            </Button>
          </CardHeader>
          <CardContent>
            {agentMembers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No AI agents assigned yet</p>
            ) : (
              <div className="space-y-3">
                {agentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5"
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
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      {member.role}
                    </Badge>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Progress</TableHead>
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
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.assignee_handle ? (
                        <span className="text-sm">{task.assignee_handle}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                            <Link href={`/tasks/${task.id}/edit`}>Edit</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
