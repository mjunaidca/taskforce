"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { WorkerRead } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  Calendar,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react"

const AGENT_TYPES = [
  { value: "claude", label: "Claude" },
  { value: "qwen", label: "Qwen" },
  { value: "gemini", label: "Gemini" },
  { value: "custom", label: "Custom" },
]

const SUGGESTED_CAPABILITIES = [
  "code", "analysis", "writing", "research",
  "debugging", "testing", "documentation", "review",
]

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const agentId = Number(params.id)

  const [agent, setAgent] = useState<WorkerRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editAgentType, setEditAgentType] = useState<string>("")
  const [editCapabilities, setEditCapabilities] = useState<string[]>([])
  const [newCapability, setNewCapability] = useState("")
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete state
  const [deleting, setDeleting] = useState(false)

  const fetchAgent = async () => {
    try {
      setLoading(true)
      const data = await api.getAgent(agentId)
      setAgent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (agentId) {
      fetchAgent()
    }
  }, [agentId])

  // Auto-open edit dialog when ?edit=true
  useEffect(() => {
    if (agent && searchParams.get("edit") === "true") {
      openEditDialog()
    }
  }, [agent, searchParams])

  const openEditDialog = () => {
    if (agent) {
      setEditName(agent.name)
      setEditAgentType(agent.agent_type || "custom")
      setEditCapabilities(agent.capabilities || [])
      setEditError(null)
      setEditDialogOpen(true)
    }
  }

  const addCapability = (cap: string) => {
    const trimmed = cap.trim().toLowerCase()
    if (trimmed && !editCapabilities.includes(trimmed)) {
      setEditCapabilities([...editCapabilities, trimmed])
    }
    setNewCapability("")
  }

  const removeCapability = (cap: string) => {
    setEditCapabilities(editCapabilities.filter((c) => c !== cap))
  }

  const handleSave = async () => {
    if (!agent) return
    setEditError(null)

    if (!editName.trim()) {
      setEditError("Name is required")
      return
    }

    try {
      setSaving(true)
      const updated = await api.updateAgent(agent.id, {
        name: editName.trim(),
        agent_type: editAgentType as "claude" | "qwen" | "gemini" | "custom",
        capabilities: editCapabilities,
      })
      setAgent(updated)
      setEditDialogOpen(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update agent")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!agent) return
    try {
      setDeleting(true)
      await api.deleteAgent(agent.id)
      router.push("/agents")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete agent")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Agent not found"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
        <div className="flex gap-2">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Agent</DialogTitle>
                <DialogDescription>
                  Update agent information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {editError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {editError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="editName">Name</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editType">Agent Type</Label>
                  <Select value={editAgentType} onValueChange={setEditAgentType} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capabilities</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editCapabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="gap-1">
                        {cap}
                        <button
                          type="button"
                          onClick={() => removeCapability(cap)}
                          className="ml-1 hover:text-destructive"
                          disabled={saving}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add capability..."
                      value={newCapability}
                      onChange={(e) => setNewCapability(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addCapability(newCapability)
                        }
                      }}
                      disabled={saving}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addCapability(newCapability)}
                      disabled={saving || !newCapability.trim()}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-muted-foreground mr-2">Suggestions:</span>
                    {SUGGESTED_CAPABILITIES.filter((c) => !editCapabilities.includes(c)).slice(0, 5).map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => addCapability(cap)}
                        className="text-xs text-primary hover:underline"
                        disabled={saving}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {agent.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Agent Info Card */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {agent.name}
                <Badge variant="outline" className="ml-2">
                  {agent.agent_type || "custom"}
                </Badge>
              </CardTitle>
              <CardDescription className="font-mono">{agent.handle}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{agent.agent_type || "Custom"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {new Date(agent.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Capabilities</p>
            {agent.capabilities && agent.capabilities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary">
                    {cap}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No capabilities defined</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
