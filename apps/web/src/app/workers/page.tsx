"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { ProjectRead, MemberRead } from "@/types"
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
import { Users, Bot, User, Search, ArrowRight, UserPlus } from "lucide-react"

interface WorkerWithProjects extends MemberRead {
  projects: string[]
}

export default function WorkersPage() {
  const [projects, setProjects] = useState<ProjectRead[]>([])
  const [workers, setWorkers] = useState<WorkerWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const projectsData = await api.getProjects()
        setProjects(projectsData)

        // Aggregate workers from all projects
        const workerMap = new Map<number, WorkerWithProjects>()

        for (const project of projectsData) {
          const members = await api.getProjectMembers(project.id)
          for (const member of members) {
            if (workerMap.has(member.worker_id)) {
              workerMap.get(member.worker_id)!.projects.push(project.name)
            } else {
              workerMap.set(member.worker_id, {
                ...member,
                projects: [project.name],
              })
            }
          }
        }

        setWorkers(Array.from(workerMap.values()))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load workers")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredWorkers = workers.filter(
    (worker) =>
      worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.handle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const humans = filteredWorkers.filter((w) => w.type === "human")
  const agents = filteredWorkers.filter((w) => w.type === "agent")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workers</h1>
          <p className="text-muted-foreground mt-1">
            View all team members and AI agents across your projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a
              href={`${process.env.NEXT_PUBLIC_SSO_URL || 'http://localhost:3001'}/account/organizations`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Team Member
            </a>
          </Button>
          <Button asChild className="btn-glow">
            <Link href="/agents/new">
              <Bot className="mr-2 h-4 w-4" />
              Register Agent
            </Link>
          </Button>
        </div>
      </div>

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
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{humans.length}</div>
            <p className="text-xs text-muted-foreground">Human workers</p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
            <Bot className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-muted-foreground">Registered agents</p>
          </CardContent>
        </Card>
      </div>

      {/* Workers Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>All Workers</CardTitle>
          <CardDescription>
            Humans and AI agents are equal workers - both appear here
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No workers found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "Try a different search term" : "No workers in your projects yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.worker_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            worker.type === "agent" ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          {worker.type === "agent" ? (
                            <Bot className="h-5 w-5 text-primary" />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{worker.name}</p>
                          <p
                            className={`text-sm ${
                              worker.type === "agent" ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {worker.handle}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          worker.type === "agent"
                            ? "border-primary/30 text-primary bg-primary/5"
                            : ""
                        }
                      >
                        {worker.type === "agent" ? (
                          <>
                            <Bot className="mr-1 h-3 w-3" />
                            Agent
                          </>
                        ) : (
                          <>
                            <User className="mr-1 h-3 w-3" />
                            Human
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {worker.projects.slice(0, 3).map((project, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {project}
                          </Badge>
                        ))}
                        {worker.projects.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{worker.projects.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {worker.type === "agent" && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/agents/${worker.worker_id}`}>
                            View
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
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
