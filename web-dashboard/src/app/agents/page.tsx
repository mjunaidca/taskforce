"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { WorkerRead } from "@/types"
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
import { Bot, Plus, Search, MoreHorizontal, Zap } from "lucide-react"

export default function AgentsPage() {
  const [agents, setAgents] = useState<WorkerRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true)
        const data = await api.getAgents()
        setAgents(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agents")
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.handle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getAgentTypeColor = (type: string | null) => {
    switch (type) {
      case "claude":
        return "bg-primary/10 text-primary border-primary/30"
      case "qwen":
        return "bg-purple-500/10 text-purple-500 border-purple-500/30"
      case "gemini":
        return "bg-blue-500/10 text-blue-500 border-blue-500/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI agents - they work alongside humans as equals
          </p>
        </div>
        <Button asChild className="btn-glow">
          <Link href="/agents/new">
            <Plus className="mr-2 h-4 w-4" />
            Register Agent
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Agent Parity</p>
            <p className="text-sm text-muted-foreground mt-1">
              AI agents are first-class workers in TaskFlow. They can be assigned tasks,
              update progress, and complete work just like human team members. All actions
              are fully auditable.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card className="card-elevated">
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
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="p-12 text-center">
              <Bot className="h-12 w-12 mx-auto text-primary/50 mb-4" />
              <h3 className="text-lg font-medium">No agents registered</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? "Try a different search term"
                  : "Register your first AI agent to get started"}
              </p>
              {!searchQuery && (
                <Button className="mt-4" asChild>
                  <Link href="/agents/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Register Agent
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => (
                  <TableRow key={agent.id} className="group">
                    <TableCell>
                      <Link
                        href={`/agents/${agent.id}`}
                        className="flex items-center gap-3 hover:text-primary transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-sm text-primary">{agent.handle}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getAgentTypeColor(agent.agent_type)}>
                        {agent.agent_type || "custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.slice(0, 3).map((cap, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                        {agent.capabilities.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{agent.capabilities.length - 3}
                          </Badge>
                        )}
                        {agent.capabilities.length === 0 && (
                          <span className="text-muted-foreground text-sm">None specified</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(agent.created_at).toLocaleDateString()}
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
                            <Link href={`/agents/${agent.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/agents/${agent.id}?edit=true`}>Edit</Link>
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
