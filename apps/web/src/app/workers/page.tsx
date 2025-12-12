"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { api } from "@/lib/api"
import { ProjectRead } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  User,
  Search,
  UserPlus,
  AlertTriangle,
  Plus,
  Shield,
  Crown,
  CheckCircle2,
} from "lucide-react"

interface OrgMember {
  user_id: string
  email: string
  name: string
  image: string | null
  org_role: string
  projects: Array<{ id: number; name: string; role: string }>
  has_project_access: boolean
}

// The default org contains all platform users - don't show team management for it
const DEFAULT_ORG_ID = "taskflow-default-org-id"

export default function WorkersPage() {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth()
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [projects, setProjects] = useState<ProjectRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [totalMembers, setTotalMembers] = useState(0)

  // Check if user is in the default public org
  const isDefaultOrg = user?.tenant_id === DEFAULT_ORG_ID

  useEffect(() => {
    // Wait for auth to be ready before making API calls
    if (authLoading || !isAuthenticated) {
      return
    }

    // Don't fetch workers for default org - it contains all platform users
    if (isDefaultOrg) {
      setLoading(false)
      return
    }

    async function fetchData() {
      try {
        setLoading(true)

        // Fetch org members and projects in parallel
        const [workersData, projectsData] = await Promise.all([
          api.getWorkers(),
          api.getProjects(),
        ])

        setOrgMembers(workersData.org_members)
        setUnassignedCount(workersData.unassigned_count)
        setTotalMembers(workersData.total_members)
        setProjects(projectsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team members")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authLoading, isAuthenticated, isDefaultOrg])

  const handleAddToProject = async (userId: string, projectId: number) => {
    try {
      await api.addProjectMember(projectId, { user_id: userId })
      // Refresh data
      const workersData = await api.getWorkers()
      setOrgMembers(workersData.org_members)
      setUnassignedCount(workersData.unassigned_count)
    } catch (err) {
      console.error("Failed to add member to project:", err)
    }
  }

  const filteredMembers = orgMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const assignedCount = totalMembers - unassignedCount

  const getOrgRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3" />
      case "admin":
        return <Shield className="h-3 w-3" />
      default:
        return null
    }
  }

  const getOrgRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "border-yellow-500/30 text-yellow-600 bg-yellow-500/5"
      case "admin":
        return "border-blue-500/30 text-blue-600 bg-blue-500/5"
      default:
        return ""
    }
  }

  // Show different UI for default org (public workspace)
  if (isDefaultOrg) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Create a private workspace to collaborate with your team
          </p>
        </div>

        <Card className="card-elevated">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">You&apos;re in the Public Workspace</CardTitle>
            <CardDescription className="text-base max-w-md mx-auto">
              The public workspace is shared by all TaskFlow users. To manage a private team, create your own organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-4">
            <Button asChild size="lg">
              <a
                href={`${process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:3001"}/account/organizations`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Private Organization
              </a>
            </Button>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Private organizations let you invite team members, manage access, and collaborate on projects together.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your organization members and their project access
          </p>
        </div>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <a
            href={`${process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:3001"}/account/organizations`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite to Org
          </a>
        </Button>
      </div>

      {/* Unassigned Warning */}
      {unassignedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {unassignedCount} member{unassignedCount > 1 ? "s" : ""} without project access
            </p>
            <p className="text-sm opacity-80">
              These org members can&apos;t access any projects yet. Add them to a project below.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">People in your organization</p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Access</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{assignedCount}</div>
            <p className="text-xs text-muted-foreground">Assigned to projects</p>
          </CardContent>
        </Card>

        <Card className={`card-interactive ${unassignedCount > 0 ? "border-amber-500/30" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Access</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${unassignedCount > 0 ? "text-amber-500" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${unassignedCount > 0 ? "text-amber-500" : ""}`}>
              {unassignedCount}
            </div>
            <p className="text-xs text-muted-foreground">Need project access</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People in your organization. Assign them to projects to grant access.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No members found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "Try a different search term" : "Invite people to your organization"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Member</TableHead>
                  <TableHead className="hidden sm:table-cell">Org Role</TableHead>
                  <TableHead className="min-w-[150px]">Project Access</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow
                    key={member.user_id}
                    className={!member.has_project_access ? "bg-amber-500/5" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          {member.image ? (
                            <img
                              src={member.image}
                              alt={member.name}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={getOrgRoleColor(member.org_role)}>
                        {getOrgRoleIcon(member.org_role)}
                        <span className={getOrgRoleIcon(member.org_role) ? "ml-1" : ""}>
                          {member.org_role}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.has_project_access ? (
                        <div className="flex flex-wrap gap-1">
                          {member.projects.slice(0, 3).map((project) => (
                            <Badge key={project.id} variant="secondary" className="text-xs">
                              {project.name}
                              {project.role === "owner" && (
                                <Crown className="ml-1 h-3 w-3 text-yellow-500" />
                              )}
                            </Badge>
                          ))}
                          {member.projects.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{member.projects.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 text-amber-600 bg-amber-500/5"
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          No access
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="mr-1 h-3 w-3" />
                            Add to Project
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {projects.length === 0 ? (
                            <DropdownMenuItem disabled>No projects available</DropdownMenuItem>
                          ) : (
                            projects.map((project) => {
                              const alreadyMember = member.projects.some(
                                (p) => p.id === project.id
                              )
                              return (
                                <DropdownMenuItem
                                  key={project.id}
                                  disabled={alreadyMember}
                                  onClick={() => handleAddToProject(member.user_id, project.id)}
                                >
                                  {project.name}
                                  {alreadyMember && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (already member)
                                    </span>
                                  )}
                                </DropdownMenuItem>
                              )
                            })
                          )}
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
    </div>
  )
}
