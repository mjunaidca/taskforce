"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, Bot, X } from "lucide-react"

const AGENT_TYPES = [
  { value: "claude", label: "Claude", description: "Anthropic's Claude AI" },
  { value: "qwen", label: "Qwen", description: "Alibaba's Qwen AI" },
  { value: "gemini", label: "Gemini", description: "Google's Gemini AI" },
  { value: "custom", label: "Custom", description: "Custom or other AI agent" },
]

const SUGGESTED_CAPABILITIES = [
  "code",
  "analysis",
  "writing",
  "research",
  "debugging",
  "testing",
  "documentation",
  "review",
]

export default function NewAgentPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [handle, setHandle] = useState("")
  const [agentType, setAgentType] = useState<string>("")
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [newCapability, setNewCapability] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate handle from name
  const handleNameChange = (value: string) => {
    setName(value)
    const generatedHandle =
      "@" +
      value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 50)
    setHandle(generatedHandle)
  }

  const addCapability = (cap: string) => {
    const trimmed = cap.trim().toLowerCase()
    if (trimmed && !capabilities.includes(trimmed)) {
      setCapabilities([...capabilities, trimmed])
    }
    setNewCapability("")
  }

  const removeCapability = (cap: string) => {
    setCapabilities(capabilities.filter((c) => c !== cap))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !handle.trim() || !agentType) {
      setError("Name, handle, and agent type are required")
      return
    }

    if (!handle.startsWith("@")) {
      setError("Handle must start with @")
      return
    }

    try {
      setLoading(true)
      const agent = await api.createAgent({
        name: name.trim(),
        handle: handle.trim(),
        agent_type: agentType as "claude" | "qwen" | "gemini" | "custom",
        capabilities: capabilities.length > 0 ? capabilities : undefined,
      })
      router.push(`/agents/${agent.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register agent")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/agents">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agents
        </Link>
      </Button>

      {/* Form */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Register AI Agent</CardTitle>
              <CardDescription>
                Add an AI agent that can be assigned tasks just like human team members
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

            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                placeholder="Claude Code"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={loading}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name for this agent
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                placeholder="@claude-code"
                value={handle}
                onChange={(e) => {
                  let val = e.target.value.toLowerCase()
                  if (!val.startsWith("@")) val = "@" + val
                  val = val.replace(/[^a-z0-9_@-]/g, "")
                  setHandle(val)
                }}
                disabled={loading}
                maxLength={51}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier starting with @ (e.g., @claude-code)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agentType">Agent Type</Label>
              <Select value={agentType} onValueChange={setAgentType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Capabilities (optional)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary" className="gap-1">
                    {cap}
                    <button
                      type="button"
                      onClick={() => removeCapability(cap)}
                      className="ml-1 hover:text-destructive"
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
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addCapability(newCapability)}
                  disabled={loading || !newCapability.trim()}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-muted-foreground mr-2">Suggestions:</span>
                {SUGGESTED_CAPABILITIES.filter((c) => !capabilities.includes(c)).map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => addCapability(cap)}
                    className="text-xs text-primary hover:underline"
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="btn-glow">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Agent
              </Button>
              <Button type="button" variant="outline" asChild disabled={loading}>
                <Link href="/agents">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
