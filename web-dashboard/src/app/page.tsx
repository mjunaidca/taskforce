"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Terminal,
  Users,
  Zap,
  Sparkles,
  Code2,
  Command,
  ShieldCheck,
  Cpu,
  Network,
  Bot,
  CheckCircle,
  Building,
  FolderKanban,
  GitBranch,
  Loader2,
  Layout,
  Layers,
  Globe,
  FileText,
  Activity,
  ArrowRight
} from "lucide-react"
import { initiateLogin, getSession } from "@/lib/auth"
import Link from "next/link"

// --- Orchestrator Demo (The "Live Execution" Layer) ---
function OrchestratorDemo() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 6)
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative bg-ifk-gray-950 border border-ifk-gray-800 rounded-xl overflow-hidden shadow-2xl max-w-6xl mx-auto flex flex-col h-[600px]">

      {/* Top Section: Split Planning vs Execution */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">

        {/* LEFT: Generative Planning (TaskFlow) */}
        <div className="w-full md:w-5/12 bg-ifk-gray-900/50 border-r border-ifk-gray-800 p-6 flex flex-col relative">
          <div className="flex items-center gap-2 mb-6 border-b border-ifk-gray-800 pb-3">
            <div className="h-6 w-6 rounded bg-ifk-cyan-500/20 text-ifk-cyan-400 flex items-center justify-center">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="text-xs font-bold text-ifk-gray-300 uppercase tracking-widest">Conversational Gen UI (Planning)</span>
          </div>

          <div className="space-y-6 flex-1">
            {/* Human */}
            <div className={`flex gap-3 transition-all duration-500 ${step >= 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
              <div className="h-8 w-8 rounded-full bg-ifk-amber-500/10 text-ifk-amber-500 flex items-center justify-center shrink-0 border border-ifk-amber-500/20">
                <Users className="h-4 w-4" />
              </div>
              <div className="bg-ifk-gray-800/50 rounded-lg p-3 text-sm text-ifk-gray-200 border border-ifk-gray-700 w-full">
                <p>Plan Phase V. We need Dapr pipes and Priority API.</p>
              </div>
            </div>

            {/* Orchestrator */}
            <div className={`flex gap-3 transition-all duration-500 delay-100 ${step >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
              <div className="h-8 w-8 rounded-full bg-ifk-cyan-500/10 text-ifk-cyan-500 flex items-center justify-center shrink-0 border border-ifk-cyan-500/20">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-ifk-cyan-950/20 rounded-lg p-3 text-sm text-ifk-gray-300 border border-ifk-cyan-500/20 w-full space-y-2">
                <p className="flex items-center gap-2">
                  <Activity className="h-3 w-3 animate-pulse" />
                  Analyzing Requirements...
                </p>
                {step >= 2 && (
                  <div className="pl-4 border-l border-ifk-cyan-500/20 text-xs text-ifk-gray-400 space-y-1">
                    <p>1. Infrastructure: <span className="text-ifk-cyan-400">Delegating to Claude</span></p>
                    <p>2. API Layer: <span className="text-ifk-pink-400">Delegating to Qwen</span></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Agent Execution (Terminal/MCP) */}
        <div className="flex-1 bg-black p-6 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]"></div>

          <div className="flex items-center justify-between mb-6 border-b border-ifk-gray-900 pb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-ifk-gray-800 text-ifk-gray-400 flex items-center justify-center">
                <Terminal className="h-3 w-3" />
              </div>
              <span className="text-xs font-bold text-ifk-gray-300 uppercase tracking-widest">Coding Agent Execution (Working)</span>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">MCP Connected</Badge>
          </div>

          <div className="space-y-4 relative z-10">
            {/* Claude */}
            <div className={`bg-ifk-gray-900/40 border border-ifk-gray-800 rounded p-4 transition-all duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-30 grayscale'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-ifk-cyan-400 font-bold">@claude-code</span>
                <span className="text-[10px] text-ifk-gray-500 font-mono">PID: 8821</span>
              </div>
              <div className="font-mono text-xs text-ifk-gray-400 space-y-1">
                <p><span className="text-purple-400">$</span> mcp install dapr-sidecar</p>
                <p>&gt; Deploying Redis state store... <span className="text-green-500">OK</span></p>
              </div>
            </div>

            {/* Qwen */}
            <div className={`bg-ifk-gray-900/40 border border-ifk-gray-800 rounded p-4 transition-all duration-300 delay-100 ${step >= 4 ? 'opacity-100' : 'opacity-30 grayscale'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-ifk-pink-400 font-bold">@qwen-cli</span>
                <span className="text-[10px] text-ifk-gray-500 font-mono">PID: 8823</span>
              </div>
              <div className="font-mono text-xs text-ifk-gray-400 space-y-1">
                <p><span className="text-purple-400">$</span> mcp generate-migration --add-priority</p>
                <p>&gt; Schema updated. Migrating DB... <span className="text-green-500">OK</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Unified Audit Log */}
      <div className="h-32 bg-ifk-gray-950 border-t border-ifk-gray-800 p-4 font-mono text-[10px] text-ifk-gray-500 overflow-hidden relative">
        <div className="absolute top-0 left-0 bg-ifk-cyan-500/10 px-2 py-0.5 text-ifk-cyan-500 border-r border-b border-ifk-cyan-500/20 rounded-br">Unified Audit Stream</div>
        <div className="mt-4 space-y-1 opacity-70">
          <div className="flex gap-4">
            <span className="text-ifk-gray-600">10:00:23.001</span>
            <span className="text-blue-500">INFO</span>
            <span>Human [H] initiated planning session #8821</span>
          </div>
          <div className="flex gap-4">
            <span className="text-ifk-gray-600">10:00:24.450</span>
            <span className="text-yellow-500">WARN</span>
            <span>TaskFlow [O] detected Ambiguous Requirement: &quot;Priority System&quot;</span>
          </div>
          <div className="flex gap-4">
            <span className="text-ifk-gray-600">10:00:25.100</span>
            <span className="text-green-500">EXEC</span>
            <span>Claude Code [W] claimed task: &quot;Setup Dapr&quot;</span>
          </div>
          {step >= 4 && (
            <div className="flex gap-4 animate-fade-in-up">
              <span className="text-ifk-gray-600">10:00:28.220</span>
              <span className="text-green-500">EXEC</span>
              <span>Qwen CLI [W] committed migration 004_priority.sql</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Interactive Feature Tour (The "Management" Layer) ---
function InteractiveTour() {
  const [activeTab, setActiveTab] = useState<'org' | 'project' | 'tasks'>('org')
  const [isPaused, setIsPaused] = useState(false)

  // Auto-Rotation
  useEffect(() => {
    if (isPaused) return;

    const tabs: ('org' | 'project' | 'tasks')[] = ['org', 'project', 'tasks'];
    const timer = setInterval(() => {
      setActiveTab(current => {
        const nextIndex = (tabs.indexOf(current) + 1) % tabs.length;
        return tabs[nextIndex];
      })
    }, 4000)

    return () => clearInterval(timer)
  }, [isPaused])

  return (
    <div
      className="grid lg:grid-cols-12 gap-8 items-start"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Navigation */}
      <div className="lg:col-span-4 space-y-4">
        <div
          onClick={() => setActiveTab('org')}
          className={`p-6 rounded-xl border cursor-pointer transition-all duration-500 relative overflow-hidden ${activeTab === 'org' ? 'bg-ifk-gray-900 border-ifk-cyan-500/50 shadow-cyan-sm scale-[1.02]' : 'bg-ifk-gray-950 border-ifk-gray-800 hover:border-ifk-gray-700'}`}
        >
          {activeTab === 'org' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-ifk-cyan-500"></div>}
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${activeTab === 'org' ? 'bg-ifk-cyan-900/30 text-ifk-cyan-400' : 'bg-ifk-gray-900 text-ifk-gray-400'}`}>
              <Building className="h-5 w-5" />
            </div>
            <h3 className={`font-semibold ${activeTab === 'org' ? 'text-white' : 'text-ifk-gray-300'}`}>Organization</h3>
          </div>
          <p className="text-sm text-ifk-gray-400 ml-12">
            Invite your team. Define roles. Secure your Multi-Tenant Workspace.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('project')}
          className={`p-6 rounded-xl border cursor-pointer transition-all duration-500 relative overflow-hidden ${activeTab === 'project' ? 'bg-ifk-gray-900 border-ifk-amber-500/50 shadow-amber-sm scale-[1.02]' : 'bg-ifk-gray-950 border-ifk-gray-800 hover:border-ifk-gray-700'}`}
        >
          {activeTab === 'project' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-ifk-amber-500"></div>}
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${activeTab === 'project' ? 'bg-ifk-amber-900/30 text-ifk-amber-400' : 'bg-ifk-gray-900 text-ifk-gray-400'}`}>
              <FolderKanban className="h-5 w-5" />
            </div>
            <h3 className={`font-semibold ${activeTab === 'project' ? 'text-white' : 'text-ifk-gray-300'}`}>Projects</h3>
          </div>
          <p className="text-sm text-ifk-gray-400 ml-12">
            Create strategic containers. Handoff context to Agents.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('tasks')}
          className={`p-6 rounded-xl border cursor-pointer transition-all duration-500 relative overflow-hidden ${activeTab === 'tasks' ? 'bg-ifk-gray-900 border-ifk-pink-500/50 shadow-lg scale-[1.02]' : 'bg-ifk-gray-950 border-ifk-gray-800 hover:border-ifk-gray-700'}`}
        >
          {activeTab === 'tasks' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-ifk-pink-500"></div>}
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${activeTab === 'tasks' ? 'bg-ifk-pink-900/30 text-ifk-pink-400' : 'bg-ifk-gray-900 text-ifk-gray-400'}`}>
              <GitBranch className="h-5 w-5" />
            </div>
            <h3 className={`font-semibold ${activeTab === 'tasks' ? 'text-white' : 'text-ifk-gray-300'}`}>Recursive Tasks</h3>
          </div>
          <p className="text-sm text-ifk-gray-400 ml-12">
            Watch Tasks break down into sub-tasks (and sub-sub-tasks) automatically.
          </p>
        </div>
      </div>

      {/* Visualizer Frame */}
      <div className="lg:col-span-8 bg-black border border-ifk-gray-800 rounded-xl overflow-hidden min-h-[400px] relative shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-8 bg-ifk-gray-900 border-b border-ifk-gray-800 flex items-center px-4 gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/20"></div>
          <div className="h-3 w-3 rounded-full bg-amber-500/20"></div>
          <div className="h-3 w-3 rounded-full bg-green-500/20"></div>
          <Badge variant="outline" className="ml-4 bg-black/50 border-ifk-gray-700 text-ifk-gray-400 text-[10px] font-mono gap-1">
            <ShieldCheck className="h-3 w-3" /> Secure Tenant: 8821-XCA
          </Badge>
        </div>

        <div className="p-8 pt-12 h-full">
          {activeTab === 'org' && <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between border-b border-ifk-gray-800 pb-4">
              <div>
                <h4 className="text-xl font-bold">Acme Corp Inc.</h4>
                <p className="text-sm text-ifk-gray-500 font-mono">Tenant ID: 8821-XCA-22</p>
              </div>
              <Badge className="bg-ifk-cyan-500/10 text-ifk-cyan-400 border-ifk-cyan-500/20">
                <ShieldCheck className="h-3 w-3 mr-1" /> Enterprise Secure
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-ifk-gray-900/50 rounded-lg border border-ifk-gray-800">
                <div className="text-xs text-ifk-gray-400 mb-1">Total Members</div>
                <div className="text-2xl font-bold">24 Humans</div>
              </div>
              <div className="p-4 bg-ifk-gray-900/50 rounded-lg border border-ifk-gray-800">
                <div className="text-xs text-ifk-gray-400 mb-1">Active Agents</div>
                <div className="text-2xl font-bold text-ifk-cyan-500">8 Workers</div>
              </div>
            </div>
          </div>}

          {activeTab === 'project' && <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between border-b border-ifk-gray-800 pb-4">
              <h4 className="text-xl font-bold">Project: Phase V Launch</h4>
              <Button size="sm" className="h-7 text-xs bg-ifk-amber-600 hover:bg-ifk-amber-500">Edit Strategy</Button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="w-1 bg-ifk-amber-500 rounded-full h-auto"></div>
                <div className="flex-1">
                  <h5 className="font-semibold text-ifk-gray-200">Objective</h5>
                  <p className="text-sm text-ifk-gray-400">Implement Dapr & Scaling infrastructure.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1 bg-ifk-gray-700 rounded-full h-auto"></div>
                <div className="flex-1">
                  <h5 className="font-semibold text-ifk-gray-200">Context</h5>
                  <p className="text-sm text-ifk-gray-400">Low-cost execution. Use existing clusters.</p>
                </div>
              </div>
            </div>
          </div>}

          {activeTab === 'tasks' && <div className="animate-fade-in space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <GitBranch className="h-5 w-5 text-ifk-pink-500" />
              <h4 className="font-bold">Execution Tree</h4>
            </div>

            <div className="relative pl-4 border-l-2 border-ifk-gray-800 space-y-4">
              <div className="relative">
                <div className="absolute -left-[18px] top-3 w-4 h-0.5 bg-ifk-gray-800"></div>
                <div className="p-3 bg-ifk-gray-900 border border-ifk-gray-700 rounded-lg w-full">
                  <div className="font-semibold text-sm">Main Task: Launch Phase V</div>
                </div>
              </div>

              <div className="relative ml-8">
                <div className="absolute -left-[30px] top-3 w-6 h-0.5 bg-ifk-gray-800"></div>
                <div className="absolute -left-[32px] -top-8 bottom-3 w-0.5 bg-ifk-gray-800"></div>
                <div className="p-3 bg-ifk-gray-900/80 border border-ifk-cyan-500/30 rounded-lg w-full">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Subtask: Infrastructure</span>
                    <Badge className="bg-ifk-cyan-500/20 text-ifk-cyan-400 border-0 text-[10px]">Agent: Claude</Badge>
                  </div>
                </div>

                <div className="relative ml-8 mt-4">
                  <div className="absolute -left-[30px] top-3 w-6 h-0.5 bg-ifk-gray-800"></div>
                  <div className="absolute -left-[32px] -top-8 bottom-3 w-0.5 bg-ifk-gray-800"></div>
                  <div className="p-2 bg-black border border-ifk-gray-800 rounded-lg w-full flex items-center gap-2 opacity-70">
                    <Loader2 className="h-3 w-3 text-ifk-pink-500 animate-spin" />
                    <span className="text-xs text-ifk-gray-400">Deploying Redis...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>}

        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getSession().then((session) => {
      if (session.authenticated) {
        router.push("/dashboard")
      } else {
        setChecking(false)
      }
    })
  }, [router])

  const handleGetStarted = () => {
    initiateLogin()
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <Zap className="h-8 w-8 text-ifk-cyan-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-ifk-cyan-500/30 selection:text-ifk-cyan-500 overflow-hidden font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-25%] left-[-25%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,rgba(0,0,0,0)_60%)] animate-pulse-soft" />
        <div className="absolute bottom-[-25%] right-[-25%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(245,158,11,0.05)_0%,rgba(0,0,0,0)_60%)] animate-pulse-soft" style={{ animationDelay: "-2s" }} />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white_10%,transparent_70%)] opacity-10" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-ifk-gray-900 bg-black/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-ifk-cyan-600 to-ifk-cyan-800 flex items-center justify-center shadow-lg shadow-ifk-cyan-900/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-xl text-white">TaskFlow</span>
            <Badge variant="outline" className="hidden md:flex bg-ifk-gray-900 text-ifk-gray-400 border-ifk-gray-800 gap-1 ml-2">
              <ShieldCheck className="h-3 w-3" />
              Multi-Tenant
            </Badge>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-ifk-gray-400">
              <Link href="#" className="hover:text-white transition-colors">Manifesto</Link>
              <Link href="#" className="hover:text-white transition-colors">Agents</Link>
            </div>
            <Button onClick={handleGetStarted} className="bg-white text-black hover:bg-ifk-cyan-500 hover:text-white transition-all font-semibold rounded-lg px-5">
              Launch Workspace
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative z-10 pt-36 pb-24 px-4 overflow-hidden">
        <div className="container mx-auto max-w-7xl">

          <div className="text-center mb-16 space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ifk-cyan-500/20 bg-ifk-cyan-950/30 text-ifk-cyan-400 text-xs font-mono uppercase tracking-wider mb-2">
              <Layers className="h-3 w-3" />
              The Missing Projects Layer
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.1]">
              The Operating System for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-ifk-cyan-300 via-white to-ifk-cyan-300">your AI Workforce.</span>
            </h1>

            <p className="text-lg md:text-xl text-ifk-gray-400 max-w-3xl mx-auto leading-relaxed">
              Plan with TaskFlow. Execute with Agents. Audit everything.
              <br className="hidden md:block" />
              The only project management platform designed for the Agent Era.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button size="lg" onClick={handleGetStarted} className="h-14 px-8 text-lg bg-ifk-cyan-600 hover:bg-ifk-cyan-500 shadow-cyan-lg hover:shadow-cyan-xl transition-all">
                Start Managing
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} className="h-14 px-8 text-lg border-ifk-gray-800 hover:bg-ifk-gray-900 text-ifk-gray-300">
                Experience Live Demo
              </Button>
            </div>
          </div>

          {/* 1. How it works (Interactive Tour) */}
          <div className="mt-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <InteractiveTour />
          </div>

        </div>
      </section>

      {/* 2. Live Execution (Orchestrator Demo) */}
      <section id="demo" className="py-24 border-y border-ifk-gray-900 bg-ifk-gray-950/30">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold mb-4">Unified Planning & Execution</h2>
            <p className="text-ifk-gray-400 max-w-2xl mx-auto">
              Conversational planning on the left. Autonomous execution on the right.
            </p>
          </div>

          <OrchestratorDemo />
        </div>
      </section>

      {/* 3. The Feature Grid */}
      <section className="py-24 bg-black relative">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-ifk-gray-950/50 backdrop-blur border-ifk-gray-800 hover:border-ifk-cyan-500/50 transition-all group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-ifk-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-8 space-y-4 relative z-10">
                <div className="h-12 w-12 rounded-lg bg-ifk-cyan-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Cpu className="h-6 w-6 text-ifk-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white">AI Coding Agents</h3>
                <p className="text-ifk-gray-400 leading-relaxed">
                  Don&apos;t just chat. Connect specialized agents like Claude Code & Qwen directly via native MCP integration.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-ifk-gray-900/50 backdrop-blur border-ifk-gray-800 hover:border-ifk-amber-500/50 transition-all group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-ifk-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-8 space-y-4 relative z-10">
                <div className="h-12 w-12 rounded-lg bg-ifk-amber-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <ShieldCheck className="h-6 w-6 text-ifk-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Secure Workspaces</h3>
                <p className="text-ifk-gray-400 leading-relaxed">
                  Data isolation built-in. Your team&apos;s data is cryptographically scoped. Hidden complexity, maximum security.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-ifk-gray-950/50 backdrop-blur border-ifk-gray-800 hover:border-ifk-pink-500/30 transition-all group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-ifk-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-8 space-y-4 relative z-10">
                <div className="h-12 w-12 rounded-lg bg-ifk-pink-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Users className="h-6 w-6 text-ifk-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Hybrid Workflow</h3>
                <p className="text-ifk-gray-400 leading-relaxed">
                  Agents handle the code. Humans handle the goals. Orchestrate both in a single, unified interface.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Final CTA */}
      <section className="py-24 border-t border-ifk-gray-900 bg-gradient-to-b from-black to-ifk-gray-900/20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">Stop Chatting. <br /> Start Orchestrating.</h2>
          <Button size="lg" onClick={handleGetStarted} className="h-16 px-10 text-xl bg-white text-black hover:bg-ifk-cyan-500 hover:text-white shadow-2xl transition-all rounded-full group">
            Deploy Your Workspace
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      <footer className="py-12 bg-black border-t border-ifk-gray-900">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-ifk-gray-500">
            <Zap className="h-4 w-4" />
            <span className="font-mono text-sm tracking-widest uppercase">TaskFlow Platform</span>
          </div>
          <div className="flex gap-8 text-sm text-ifk-gray-600">
            <span>Built for Hackathon II</span>
            <span>•</span>
            <span>Universal MCP</span>
            <span>•</span>
            <span>Enterprise Security</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
