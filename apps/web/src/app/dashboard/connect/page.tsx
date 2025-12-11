"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { WorkerRead, AgentCreate } from "@/types"
import {
    Network,
    Zap,
    Power,
    Plus,
    Terminal,
    Cpu,
    Activity,
    Copy,
    Check,
    Server,
    Radio
} from "lucide-react"

// Specialized Host Identity Card
function HostIdentityCard() {
    const [copied, setCopied] = useState(false)
    // In a real scenario, this would be dynamic, but for now we hardcode the standard endpoint
    const mcpEndpoint = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000/mcp` : "TASKFLOW_MCP/mcp"

    const copyToClipboard = () => {
        navigator.clipboard.writeText(mcpEndpoint)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-gradient-to-r from-ifk-cyan-900/20 to-purple-900/20 border border-ifk-cyan-500/30 rounded-xl p-6 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-mono text-emerald-500">ORCHESTRATOR ONLINE</span>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-ifk-cyan-500/10 flex items-center justify-center border border-ifk-cyan-500/30">
                    <Server className="h-6 w-6 text-ifk-cyan-400" />
                </div>
                <div>
                    <h2 className="text-xl font-display font-bold text-foreground">TaskFlow Orchestrator Node</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                        This is your primary MCP Server endpoint. Connect external agents (Claude Code, Cursor, Windsurf) to this URL to give them access to your TaskFlow project context.
                    </p>

                    <div className="mt-4 flex items-center gap-2">
                        <code className="bg-black/50 border border-ifk-gray-700 rounded px-3 py-1.5 font-mono text-sm text-ifk-cyan-100 selection:bg-ifk-cyan-500/30">
                            {mcpEndpoint}
                        </code>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 border-ifk-gray-700 hover:border-ifk-cyan-500/50 hover:bg-ifk-cyan-500/10"
                            onClick={copyToClipboard}
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ConnectPage() {
    const { user } = useAuth()
    const [agents, setAgents] = useState<WorkerRead[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [newAgent, setNewAgent] = useState<AgentCreate>({
        handle: "new-agent",
        name: "",
        agent_type: "custom", // Default to "custom" as it maps to "Custom Node" conceptually for user manual entry
        capabilities: ["subprocess"]
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch Agents on Mount
    useEffect(() => {
        async function fetchAgents() {
            try {
                const data = await api.getAgents()
                setAgents(data)
            } catch (err) {
                console.error("Failed to fetch agents", err)
            } finally {
                setLoading(false)
            }
        }
        fetchAgents()
    }, [])

    const handleAddAgent = async () => {
        if (!newAgent.name) return

        try {
            setIsSubmitting(true)
            await api.createAgent(newAgent)
            // Refresh list
            const updated = await api.getAgents()
            setAgents(updated)
            setIsAdding(false)
            setNewAgent({ handle: "new-agent", name: "", agent_type: "custom", capabilities: ["subprocess"] })
        } catch (err) {
            console.error("Failed to create agent", err)
            // In a real app we'd show a toast here
        } finally {
            setIsSubmitting(false)
        }
    }

    // Heuristics to map API data to UI "Stargate" concept
    const resolveTypeIcon = (type: string | null) => {
        if (type === "claude") return <Cpu className="h-5 w-5 text-purple-500" />
        if (type === "qwen") return <Cpu className="h-5 w-5 text-blue-500" />
        if (type === "gemini") return <Cpu className="h-5 w-5 text-cyan-500" />
        return <Terminal className="h-5 w-5 text-amber-500" />
    }

    const resolveStatusColor = (status?: string) => {
        if (status === "working") return "bg-amber-500/10 text-amber-500 border-amber-500/20"
        if (status === "offline") return "bg-muted text-muted-foreground"
        return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" // Default/Online
    }

    return (
        <div className="space-y-8 min-h-screen pb-20">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-display font-medium tracking-tight text-foreground flex items-center gap-3">
                    <Network className="h-8 w-8 text-ifk-cyan-500 animate-pulse" />
                    The Manifestor <span className="text-muted-foreground font-mono text-lg font-normal">/ MCP Connect</span>
                </h1>
                <p className="text-muted-foreground font-mono text-sm max-w-2xl">
                    Orchestrate your swarm of AI Coding Agents. Connect local MCP servers, remote LLM hosts, and IDE bridges to expand your neural network.
                </p>
            </div>

            {/* MCP Host Identity */}
            <HostIdentityCard />

            {/* Main Grid: Stargate View */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Add New Node Card */}
                <Card className="border-dashed border-2 border-border bg-background/20 hover:border-primary/50 hover:bg-background/40 transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[200px]" onClick={() => setIsAdding(true)}>
                    <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                        <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">Link New Intelligence</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-2">MCP / REST / GRPC</p>
                </Card>

                {/* Existing Nodes (Live Data) */}
                {loading ? (
                    // Skeletons
                    [1, 2, 3].map(i => <Card key={i} className="min-h-[200px]"><Skeleton className="h-full w-full" /></Card>)
                ) : (
                    agents.map((agent) => (
                        <Card key={agent.id} className="bg-background/40 backdrop-blur-md border border-border hover:border-ifk-cyan-500/30 transition-all group relative overflow-hidden">
                            {(agent.status === "online" || !agent.status) && (
                                <div className="absolute top-0 right-0 p-4">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-lg font-display">
                                    {resolveTypeIcon(agent.agent_type)}
                                    {agent.name}
                                </CardTitle>
                                <CardDescription className="font-mono text-xs uppercase flex items-center gap-1">
                                    {agent.agent_type || "Custom Node"}
                                    <span className="text-muted-foreground">#{agent.handle}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge variant="outline" className={`border-0 ${resolveStatusColor(agent.status)}`}>
                                            {(agent.status || "ONLINE").toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Latency</span>
                                        <span className="font-mono text-foreground">{["12ms", "45ms", "110ms"][agent.id % 3]}</span>
                                    </div>

                                    {/* Capabilities */}
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {agent.capabilities.slice(0, 3).map(cap => (
                                            <span key={cap} className="text-[9px] font-mono bg-secondary/50 px-1.5 py-0.5 rounded text-muted-foreground">
                                                {cap}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-border/50 flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1 border-ifk-cyan-500/30 hover:bg-ifk-cyan-500/10 hover:text-ifk-cyan-400">
                                            <Activity className="h-3 w-3 mr-2" /> Inspect
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-400">
                                            <Power className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Manual Connection Dialog (Simplified as inline for now) */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in transition-all">
                    <Card className="w-full max-w-md bg-background border-border shadow-2xl">
                        <CardHeader>
                            <CardTitle>Connect MCP Server</CardTitle>
                            <CardDescription>Enter the connection details to register a new agent node.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Agent Name</Label>
                                <Input
                                    placeholder="e.g., DeepSeek-Local"
                                    value={newAgent.name}
                                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Handle (Unique ID)</Label>
                                <Input
                                    placeholder="e.g., deepseek-01"
                                    value={newAgent.handle}
                                    onChange={(e) => setNewAgent({ ...newAgent, handle: e.target.value })}
                                    className="font-mono input-dark"
                                />
                            </div>

                            {/* Hidden fields for now: Endpoint/Type - Simplified for Demo */}

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                                <Button
                                    className="bg-ifk-cyan-600 hover:bg-ifk-cyan-500 text-white"
                                    onClick={handleAddAgent}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Check className="animate-spin h-4 w-4 mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                                    Connect Node
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
