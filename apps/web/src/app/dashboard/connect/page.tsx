"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { WorkerRead } from "@/types"
import {
    Network,
    Power,
    Terminal,
    Cpu,
    Activity,
    Copy,
    Check,
    Server,
    Sparkles,
    Code2,
    Zap
} from "lucide-react"

// MCP Configuration for different clients
interface MCPClientConfig {
    name: string
    icon: React.ReactNode
    description: string
    configFile: string
    config: object
    docsUrl?: string
    color: string
}

function getMcpEndpoint(): string {
    if (typeof window !== 'undefined') {
        return process.env.NEXT_PUBLIC_MCP_URL || `https://mcp.${window.location.hostname.replace('www.', '')}/mcp`
    }
    return "https://mcp.avixato.com/mcp"
}


// Specialized Host Identity Card
function HostIdentityCard() {
    const [copied, setCopied] = useState(false)
    const mcpEndpoint = getMcpEndpoint()

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
                        Connect your AI coding agents to TaskFlow. Copy the config below for your preferred client.
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

// MCP Config Card Component
function MCPConfigCard({ client }: { client: MCPClientConfig }) {
    const [copied, setCopied] = useState(false)

    const copyConfig = () => {
        navigator.clipboard.writeText(JSON.stringify(client.config, null, 2))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Card className={`bg-background/40 backdrop-blur-md border hover:border-opacity-50 transition-all group relative overflow-hidden ${client.color}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg font-display">
                    {client.icon}
                    {client.name}
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                    {client.description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="text-xs text-muted-foreground font-mono">
                        Add to <code className="bg-secondary/50 px-1.5 py-0.5 rounded">{client.configFile}</code>
                    </div>
                    <div className="relative">
                        <pre className="bg-black/60 border border-ifk-gray-700 rounded-lg p-3 font-mono text-xs text-ifk-cyan-100 overflow-x-auto max-h-[160px]">
                            {JSON.stringify(client.config, null, 2)}
                        </pre>
                        <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2 h-7 px-2 border-ifk-gray-600 hover:border-ifk-cyan-500/50 hover:bg-ifk-cyan-500/10 bg-black/50"
                            onClick={copyConfig}
                        >
                            {copied ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                        </Button>
                    </div>
                    {client.docsUrl && (
                        <a
                            href={client.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-ifk-cyan-400 hover:text-ifk-cyan-300 font-mono inline-flex items-center gap-1"
                        >
                            View setup docs →
                        </a>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function ConnectPage() {
    const { user } = useAuth()
    const [agents, setAgents] = useState<WorkerRead[]>([])
    const [loading, setLoading] = useState(true)

    const mcpEndpoint = getMcpEndpoint()

    // MCP Client configurations
    const mcpClients: MCPClientConfig[] = [
        {
            name: "Claude Code",
            icon: <Sparkles className="h-5 w-5 text-purple-400" />,
            description: "Anthropic's AI coding assistant",
            configFile: ".mcp.json",
            config: {
                mcpServers: {
                    "taskflow": {
                        type: "http",
                        url: mcpEndpoint
                    }
                }
            },
            docsUrl: "https://docs.anthropic.com/en/docs/claude-code",
            color: "border-purple-500/30 hover:border-purple-500/50"
        },
        // NOTE: Gemini CLI is NOT supported
        // Gemini CLI uses random ephemeral ports (49152-65535) for OAuth callbacks
        // and ignores any redirectUri configuration. Without allowDynamicClientRegistration
        // or a validateRedirectUri hook in Better Auth, we cannot support it.
        // See: https://github.com/better-auth/better-auth/issues for feature requests
        {
            name: "Cursor",
            icon: <Code2 className="h-5 w-5 text-emerald-400" />,
            description: "AI-powered code editor",
            configFile: ".cursor/mcp.json",
            config: {
                mcpServers: {
                    "taskflow": {
                        url: mcpEndpoint,
                        transport: "http"
                    }
                }
            },
            docsUrl: "https://docs.cursor.com/context/model-context-protocol",
            color: "border-emerald-500/30 hover:border-emerald-500/50"
        },
        {
            name: "Windsurf",
            icon: <Terminal className="h-5 w-5 text-cyan-400" />,
            description: "Codeium's AI IDE",
            configFile: "~/.codeium/windsurf/mcp_config.json",
            config: {
                mcpServers: {
                    "taskflow": {
                        serverUrl: mcpEndpoint
                    }
                }
            },
            docsUrl: "https://docs.codeium.com/windsurf/mcp",
            color: "border-cyan-500/30 hover:border-cyan-500/50"
        },
        {
            name: "VS Code + Copilot",
            icon: <Cpu className="h-5 w-5 text-amber-400" />,
            description: "GitHub Copilot in VS Code",
            configFile: ".vscode/mcp.json",
            config: {
                servers: {
                    "taskflow": {
                        type: "http",
                        url: mcpEndpoint
                    }
                }
            },
            docsUrl: "https://code.visualstudio.com/docs/copilot/chat/mcp-servers",
            color: "border-amber-500/30 hover:border-amber-500/50"
        }
    ]

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

    const resolveTypeIcon = (type: string | null) => {
        if (type === "claude") return <Cpu className="h-5 w-5 text-purple-500" />
        if (type === "qwen") return <Cpu className="h-5 w-5 text-blue-500" />
        if (type === "gemini") return <Cpu className="h-5 w-5 text-cyan-500" />
        return <Terminal className="h-5 w-5 text-amber-500" />
    }

    const resolveStatusColor = (status?: string) => {
        if (status === "working") return "bg-amber-500/10 text-amber-500 border-amber-500/20"
        if (status === "offline") return "bg-muted text-muted-foreground"
        return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
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
                    Connect your AI coding agents to TaskFlow's MCP server. Copy the config for your preferred tool and start managing tasks with AI.
                </p>
            </div>

            {/* MCP Host Identity */}
            <HostIdentityCard />

            {/* Quick Start Configs */}
            <div>
                <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-ifk-cyan-500" />
                    Quick Setup Configs
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Copy the configuration for your AI coding tool. Paste it into the specified config file and restart your tool.
                </p>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {mcpClients.map((client) => (
                        <MCPConfigCard key={client.name} client={client} />
                    ))}
                </div>
            </div>

            {/* Registered Agents */}
            {agents.length > 0 && (
                <div>
                    <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        Connected Agents
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {loading ? (
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
                </div>
            )}

            {/* Instructions */}
            <Card className="bg-secondary/20 border-dashed">
                <CardHeader>
                    <CardTitle className="text-lg">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-ifk-cyan-500/20 text-ifk-cyan-500 font-bold text-sm flex-shrink-0">1</div>
                            <div>
                                <p className="font-medium text-sm">Copy Config</p>
                                <p className="text-xs text-muted-foreground">Choose your AI tool above and copy the JSON config</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-500/20 text-purple-500 font-bold text-sm flex-shrink-0">2</div>
                            <div>
                                <p className="font-medium text-sm">Add to Config File</p>
                                <p className="text-xs text-muted-foreground">Paste into the specified config file in your project</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-sm flex-shrink-0">3</div>
                            <div>
                                <p className="font-medium text-sm">Authenticate</p>
                                <p className="text-xs text-muted-foreground">Your AI tool will prompt you to login via TaskFlow SSO</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
