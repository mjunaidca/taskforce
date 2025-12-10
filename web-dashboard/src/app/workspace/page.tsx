"use client";

/**
 * Agent Workspace V2 - Mission Control Cockpit
 *
 * Design Philosophy: "The Pilot's HUD" (Zen Edition)
 * - Telemetry on the Left (Minimalist)
 * - Comms in the Center (Focus Area)
 * - Squad on the Right (Overlay)
 * - Deep Atmosphere (Unobstructed View)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { ProjectRead, TaskListItem, WorkerRead } from "@/types";
import Link from "next/link";
import {
  Bot,
  Command,
  LayoutGrid,
  Sparkles,
  Zap,
  CheckSquare,
  AlertCircle,
  Activity,
  Cpu,
  Terminal,
  Clock,
  Radio,
  Settings,
  Loader2,
  Box,
  Plus,
  BarChart3
} from "lucide-react";

const isBrowser = typeof window !== "undefined";

// --- Components ---

// --- Components ---

const TelemetryCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white/5 hover:bg-white/10 backdrop-blur-sm border-l-2 p-4 rounded-r-xl transition-all group duration-300 border-transparent hover:border-ifk-cyan-500/50">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-1.5 rounded-lg ${color} bg-opacity-0 group-hover:bg-opacity-10 text-opacity-100 transition-all`}>
        <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
      </div>
      {trend && <span className="text-[10px] font-mono text-ifk-cyan-400">{trend}</span>}
    </div>
    <div className="text-2xl font-mono font-bold text-white mb-1">{value}</div>
    <div className="text-[10px] uppercase tracking-widest text-ifk-gray-400 font-medium">{label}</div>
  </div>
);

const AgentAvatar = ({ name, role, status, type }: any) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-ifk-gray-900/30 border border-ifk-gray-800/50 hover:bg-ifk-gray-800/50 transition-all cursor-pointer group">
    <div className="relative">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${type === 'planner' ? 'bg-ifk-cyan-900/20 border-ifk-cyan-500/30 text-ifk-cyan-400' :
        type === 'coder' ? 'bg-purple-900/20 border-purple-500/30 text-purple-400' :
          'bg-ifk-amber-900/20 border-ifk-amber-500/30 text-ifk-amber-400'
        }`}>
        {type === 'planner' ? <Bot className="h-5 w-5" /> :
          type === 'coder' ? <Terminal className="h-5 w-5" /> :
            <Radio className="h-5 w-5" />}
      </div>
      <div className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-black ${status === 'working' ? 'bg-ifk-amber-500 animate-pulse' :
        status === 'online' ? 'bg-emerald-500' : 'bg-ifk-gray-500'
        }`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{name}</p>
      <p className="text-[10px] text-ifk-gray-400 uppercase tracking-wider">{role}</p>
    </div>
    {status === 'working' && <Activity className="h-3 w-3 text-ifk-amber-500 animate-bounce" />}
  </div>
);

const WorkspacePage = () => {
  const { user, isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskListItem[]>([]);
  const [activeAgents, setActiveAgents] = useState<WorkerRead[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectRead | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // V3 State: Layout & Voice
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [voiceText, setVoiceText] = useState("");

  // --- ChatKit Integration ---

  // Custom Fetch for ChatKit (Auth Injection)
  const authenticatedFetch = useCallback(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (!isAuthenticated) throw new Error("User must be logged in");

    const modifiedOptions = { ...options } as RequestInit;

    // Inject Metadata for Context
    if (modifiedOptions.body && typeof modifiedOptions.body === "string") {
      try {
        const parsed = JSON.parse(modifiedOptions.body);
        const userInfo = { id: user?.sub, name: user?.name, email: user?.email };
        if (parsed.type === "threads.create" || parsed.type === "threads.run") {
          if (parsed.params?.input) {
            parsed.params.input.metadata = {
              ...parsed.params.input.metadata,
              userInfo,
              source: "voice-cockpit"
            };
          }
          modifiedOptions.body = JSON.stringify(parsed);
        }
      } catch (e) { }
    }

    return fetch(url, {
      ...modifiedOptions,
      credentials: "include",
      headers: {
        ...modifiedOptions.headers,
        "X-User-ID": user?.sub || "",
        "Content-Type": "application/json",
      },
    });
  }, [user, isAuthenticated]);

  const { control, sendUserMessage } = useChatKit({
    api: {
      url: "/api/chatkit",
      domainKey: process.env.NEXT_PUBLIC_CHATKIT_DOMAIN_KEY || "domain_pk_local_dev",
      fetch: authenticatedFetch
    },
    theme: {
      colorScheme: "dark",
    },
    composer: {
      // Keep placeholder for now as it's useful
      placeholder: "Voice System Online. Press Orb to Speak...",
    },
    // Simplified startScreen as per reference pattern (can be empty or minimal)
    startScreen: {
      greeting: "MISSION CONTROL ONLINE",
      prompts: [
        { label: "Show Projects", prompt: "Show all my projects." },
        { label: "Create Task", prompt: "I want to create a new task." },
        { label: "System Info", prompt: "What is ChatKit?" }
      ]
    }
  });

  // --- Voice Recognition Hook ---
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;

    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true; // KEEP LISTENING until manual stop or silence
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => { console.log("Mic Active"); };

    recognition.onresult = (event: any) => {
      // Clear existing silence timer on new input
      if (silenceTimer.current) clearTimeout(silenceTimer.current);

      // Combine all results
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setVoiceText(finalTranscript);

        // Set new silence timer (5s)
        silenceTimer.current = setTimeout(() => {
          if (finalTranscript.trim()) {
            console.log("Auto-sending due to silence...");
            recognition.stop(); // Stop engine
            sendUserMessage({ text: finalTranscript, newThread: false });
            setVoiceText("");
            setIsListening(false);
          }
        }, 5000);
      }
    };

    recognition.onend = () => {
      // Clear timer if engine stops manually
      if (silenceTimer.current) clearTimeout(silenceTimer.current);

      if (isListening) {
        // If stopped unexpectedly (network/error), we might want to restart or just letting it be.
        // For now, we respect the engine stop.
      }
    };

    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      // When toggling OFF manually, send if we have text
      if (voiceText.trim()) {
        sendUserMessage({ text: voiceText, newThread: false });
        setVoiceText("");
      }
    }

    return () => {
      recognition.stop();
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, [isListening]); // Only re-run when isListening toggles

  const toggleListening = () => {
    setIsListening(!isListening);
  };

  const handleManualSubmit = (text: string) => {
    sendUserMessage({ text, newThread: false });
  };

  const [scriptStatus, setScriptStatus] = useState<"pending" | "ready" | "error">(
    isBrowser && window.customElements?.get("openai-chatkit") ? "ready" : "pending"
  );
  const commandInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  // ChatKit proxy endpoint
  // const chatkitProxyUrl = "/api/chatkit"; // Removed, now part of useChatKit config
  // const effectiveDomainKey = process.env.NEXT_PUBLIC_CHATKIT_DOMAIN_KEY || "domain_pk_local_dev"; // Removed, not used directly

  // Load Data
  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchData() {
      try {
        const projectsData = await api.getProjects({ limit: 10 });
        if (isMountedRef.current) {
          setProjects(projectsData);
          if (projectsData.length > 0 && !selectedProject) {
            setSelectedProject(projectsData[0]);
            const tasks = await api.getProjectTasks(projectsData[0].id, { limit: 5 });
            setRecentTasks(tasks);
          }
          // Load agents (always global)
          const agents = await api.getAgents({ limit: 10 });
          setActiveAgents(agents);
        }
      } catch (error) { console.error("Failed to load data", error); }
    }
    fetchData();
  }, [isAuthenticated, selectedProject]); // Added selectedProject dependency to fix lint, but logic might need review if it causes loops. Ideally selectedProject only for initial load.

  // ChatKit Loader
  useEffect(() => {
    if (!isBrowser) return;
    if (window.customElements?.get("openai-chatkit")) { setScriptStatus("ready"); return; }
    customElements.whenDefined("openai-chatkit").then(() => {
      if (isMountedRef.current) setScriptStatus("ready");
    });
  }, []);

  // Cleanup
  useEffect(() => () => { isMountedRef.current = false; }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((p) => !p);
      }
      if (e.key === "Escape") setShowCommandPalette(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- Context & ChatKit Config (Simplified for V2) ---
  // const getPageContext = useCallback(() => ({ // Removed, metadata injected in authenticatedFetch
  //   url: window.location.href,
  //   title: "Agent Cockpit",
  //   path: "/workspace",
  //   projectId: selectedProject?.id,
  //   projectName: selectedProject?.name,
  //   timestamp: new Date().toISOString(),
  // }), [selectedProject]);

  // const { control, sendUserMessage } = useChatKit({ // Removed, moved above
  //   api: {
  //     url: chatkitProxyUrl,
  //     domainKey: effectiveDomainKey,
  //     fetch: async (input: RequestInfo | URL, options?: RequestInit) => {
  //       // ... (Auth logic same as V1)
  //       if (!isAuthenticated || !user) throw new Error("Auth required");
  //       const userId = user.sub;
  //       const pageContext = getPageContext();
  //       const modifiedOptions = { ...options, headers: { ...options?.headers, "X-User-ID": userId, "X-Page-URL": pageContext.url, "Content-Type": "application/json" } };
  //       return fetch(input, modifiedOptions);
  //     }
  //   },
  //   theme: { colorScheme: "dark" },
  // });

  // Loading Screen
  if (authLoading) return <div className="h-screen bg-black flex items-center justify-center"><Bot className="h-10 w-10 text-ifk-cyan-500 animate-pulse" /></div>;

  // Login Screen (Refer to V1, keeping simple for brevity in V2 update)
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="inline-flex p-4 rounded-3xl bg-ifk-cyan-900/20 border border-ifk-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
          <Bot className="h-12 w-12 text-ifk-cyan-400" />
        </div>
        <h1 className="text-3xl font-mono text-white tracking-tight">Access Restricted</h1>
        <button onClick={login} className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-ifk-cyan-400 transition-all">Authenticate</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-black text-white overflow-hidden font-sans selection:bg-ifk-cyan-500/30 flex flex-col">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(6,182,212,0.03)_0%,rgba(0,0,0,0)_60%)] animate-float" style={{ animationDuration: '20s' }} />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(4,13,33,0.8)_0%,rgba(0,0,0,0)_60%)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 [mask-image:radial-gradient(ellipse_at_center,white_10%,transparent_80%)]" />
      </div>

      {/* --- HUD Header --- */}
      <header className="h-14 border-b border-ifk-gray-800 bg-black/50 backdrop-blur-xl flex items-center justify-between px-6 relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="h-8 w-8 rounded bg-ifk-cyan-900/20 border border-ifk-cyan-500/30 flex items-center justify-center hover:bg-ifk-cyan-500/20 transition-all">
            <LayoutGrid className="h-4 w-4 text-ifk-cyan-400" />
          </Link>
          <div className="h-6 w-px bg-ifk-gray-800" />
          <div className="flex items-center gap-2">
            <span className="text-ifk-gray-500 font-mono text-xs uppercase tracking-widest">Context</span>
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 px-3 py-1 rounded bg-ifk-gray-900 border border-ifk-gray-800 hover:border-ifk-cyan-500/30 transition-all"
            >
              <span className="text-sm font-bold text-gray-200">{selectedProject?.name || "Global Command"}</span>
              <Command className="h-3 w-3 text-ifk-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* System Status */}
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-ifk-gray-900/50 border border-ifk-gray-800">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-500 uppercase">System Optimal</span>
            </div>
            <div className="h-3 w-px bg-ifk-gray-800" />
            <div className="flex items-center gap-2">
              <Cpu className="h-3 w-3 text-ifk-cyan-500" />
              <span className="text-[10px] font-mono text-ifk-cyan-500">v2.4.0</span>
            </div>
          </div>

          {/* User */}
          <div className="h-8 w-8 rounded bg-gradient-to-br from-ifk-gray-800 to-black border border-ifk-gray-700 flex items-center justify-center font-mono font-bold text-xs">
            {user?.name?.[0] || "U"}
          </div>
        </div>
      </header>

      {/* Main Layout Layer */}
      <div className="relative z-10 flex flex-1 min-h-0 p-4 gap-4 overflow-hidden">

        {/* Left HUD (Collapsible) - Slimmer & transparent */}
        <div className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isLeftOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          <div className="h-full bg-gradient-to-r from-black/40 to-transparent p-4 flex flex-col gap-4">
            {/* Telemetry Panel */}
            {/* Telemetry Panel */}
            <div className="flex-1 bg-ifk-gray-900/20 backdrop-blur-xl border border-ifk-gray-800 rounded-2xl p-4 flex flex-col relative group overflow-hidden min-h-0">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-ifk-cyan-500/50 to-transparent opacity-30" />

              <h2 className="text-xs font-mono font-bold text-ifk-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                <Radio className="h-3 w-3 text-ifk-cyan-500 animate-pulse" />
                Live Telemetry
              </h2>

              <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-2">
                <TelemetryCard label="Efficiency" value="98%" icon={BarChart3} color="bg-emerald-500" trend="+2%" />
                <TelemetryCard label="Active Units" value={activeAgents.length.toString()} icon={Box} color="bg-ifk-cyan-500" />
                <TelemetryCard label="Blockers" value="0" icon={AlertCircle} color="bg-red-500" />
                <TelemetryCard label="CPU Load" value={`${Math.floor(Math.random() * 30 + 10)}%`} icon={Zap} color="bg-amber-500" />
              </div>

              <div className="pt-4 border-t border-ifk-gray-800/50 shrink-0 mt-auto">
                <div className="text-[10px] text-ifk-gray-500 font-mono mb-1">SYSTEM STATUS</div>
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  OPERATIONAL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Stage (Fluid) */}
        <div className="flex-1 flex flex-col relative min-w-0">

          {/* Header - Now containing the Voice Core */}
          <header className="h-16 shrink-0 border-b border-ifk-gray-800 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 relative z-30">
            <div className="flex items-center gap-6">
              {/* Left Panel Toggle */}
              <button
                onClick={() => setIsLeftOpen(!isLeftOpen)}
                className={`p-2 rounded-lg transition-all ${isLeftOpen ? 'text-ifk-cyan-500 bg-ifk-cyan-500/10' : 'text-ifk-gray-500 hover:text-white'}`}
              >
                <Command className="h-5 w-5" />
              </button>

              {/* Title & Voice Core */}
              <div className="flex items-center gap-4 border-l border-ifk-gray-800 pl-6">
                <h1 className="text-xl font-display font-bold tracking-widest text-white hidden md:block">MISSION CONTROL</h1>

                {/* V7 Header Voice Orb - Labelled for Clarity */}
                <div className="flex items-center gap-3 bg-ifk-gray-900/50 rounded-full pr-4 pl-1 py-1 border border-ifk-gray-800/50 hover:border-ifk-cyan-500/30 transition-all group">
                  <button
                    onClick={toggleListening}
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 ${isListening
                      ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                      : 'bg-ifk-cyan-500/10 text-ifk-cyan-400 group-hover:bg-ifk-cyan-500/20'
                      }`}
                  >
                    {isListening ? (
                      <div className="flex gap-0.5 h-3 items-center">
                        <div className="w-0.5 bg-white rounded-full h-full animate-[bounce_1s_infinite]" />
                        <div className="w-0.5 bg-white rounded-full h-2/3 animate-[bounce_1s_infinite_0.1s]" />
                        <div className="w-0.5 bg-white rounded-full h-full animate-[bounce_1s_infinite_0.2s]" />
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-current flex items-center justify-center">
                        <div className="h-2 w-2 bg-current rounded-full" />
                      </div>
                    )}
                  </button>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-mono leading-none tracking-wider transition-colors ${isListening ? 'text-red-400 animate-pulse' : 'text-ifk-gray-400 group-hover:text-ifk-cyan-400'}`}>
                      {isListening ? 'LIVE CHANNEL' : 'VOICE SYSTEM'}
                    </span>
                    <span className="text-[8px] text-gray-600 font-mono leading-none">{isListening ? 'LISTENING...' : 'READY'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowKeyboard(!showKeyboard)}
                className={`p-2 rounded-lg transition-all ${showKeyboard ? 'text-ifk-cyan-500 bg-ifk-cyan-500/10' : 'text-ifk-gray-500 hover:text-white'}`}
                title="Manual Override"
              >
                <Terminal className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsRightOpen(!isRightOpen)}
                className={`p-2 rounded-lg transition-all ${isRightOpen ? 'text-ifk-cyan-500 bg-ifk-cyan-500/10' : 'text-ifk-gray-500 hover:text-white'}`}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* HUD Transcript Banner (Only visible when speaking) */}
          {isListening && (
            <div className="absolute top-20 left-6 right-6 z-20 flex justify-center animate-in slide-in-from-top-2 fade-in">
              <div className="bg-ifk-gray-900/90 backdrop-blur-xl border border-ifk-gray-700 rounded-lg px-6 py-3 flex items-center gap-4 shadow-xl max-w-2xl w-full">
                <div className="shrink-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <p className="font-mono text-sm text-white flex-1 truncate">
                  {voiceText || "Listening for command..."}
                </p>
                <div className="text-[10px] text-ifk-gray-500 font-mono">REC</div>
              </div>
            </div>
          )}

          {/* Manual Input HUD (Slides down from header) */}
          {showKeyboard && (
            <div className="absolute top-16 left-0 right-0 z-20 bg-ifk-gray-900 border-b border-ifk-gray-800 p-4 animate-in slide-in-from-top-2 fade-in shadow-2xl">
              <div className="max-w-3xl mx-auto flex gap-4">
                <input
                  ref={commandInputRef}
                  type="text"
                  placeholder="Manual override protocol..."
                  className="flex-1 bg-black/50 border border-ifk-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-ifk-cyan-500 outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      if (target.value) {
                        handleManualSubmit(target.value);
                        target.value = '';
                      }
                    }
                  }}
                />
                <button className="px-4 py-2 bg-ifk-cyan-900/20 border border-ifk-cyan-500/50 rounded-lg text-ifk-cyan-400 text-xs font-mono hover:bg-ifk-cyan-500/20">
                  EXECUTE
                </button>
              </div>
            </div>
          )}

          {/* Main Chat Feed - Borderless & Floating */}
          <main className="flex-1 rounded-3xl relative overflow-hidden flex flex-col pb-8 min-h-0">
            <div className="flex-1 overflow-hidden relative z-10">
              {scriptStatus === 'ready' ? (
                <div
                  className="h-full w-full relative min-h-0 [&_::part(composer)]:hidden [&_::part(message-list)]:pb-0"
                >
                  <ChatKit
                    control={control}
                    className="h-full w-full"
                    style={{
                      borderRadius: 0,
                      background: "transparent",
                    }}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-60">
                  <Loader2 className="h-8 w-8 text-ifk-cyan-500 animate-spin mb-4" />
                  <h2 className="text-sm font-mono text-gray-400">CONNECTING TO ORBIT...</h2>
                </div>
              )}
            </div>
          </main>

        </div>

        {/* Right HUD (Collapsible) - Slimmer & transparent */}
        <div className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isRightOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          <div className="h-full bg-gradient-to-l from-black/40 to-transparent p-4 flex flex-col relative min-w-[18rem]">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-ifk-amber-500/30 to-transparent opacity-30" />

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-mono font-bold text-ifk-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Box className="h-3 w-3 text-ifk-amber-500" />
                Squadron A
              </h2>
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-ifk-amber-500 animate-pulse" />
                <div className="h-1.5 w-1.5 rounded-full bg-ifk-amber-500/50" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {activeAgents.length === 0 ? (
                <div className="text-center py-4 text-gray-600 font-mono text-xs">
                  No agents online
                </div>
              ) : (
                activeAgents.map(agent => (
                  <AgentAvatar
                    key={agent.id}
                    agent={agent}
                  />
                ))
              )}
            </div>

            {/* Quick Protocols (Restored) */}
            <div className="mt-4 pt-4 border-t border-ifk-gray-800/50 shrink-0">
              <h3 className="text-[10px] font-mono font-bold text-ifk-gray-500 uppercase mb-3 text-center tracking-wider">Quick Protocols</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button className="p-3 bg-ifk-cyan-900/10 border border-ifk-cyan-500/20 rounded-xl hover:bg-ifk-cyan-500/20 hover:border-ifk-cyan-500/40 transition-all flex flex-col items-center gap-2 group">
                  <Sparkles className="h-4 w-4 text-ifk-cyan-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-medium text-ifk-cyan-400">New Sprint</span>
                </button>
                <button className="p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 hover:border-purple-500/40 transition-all flex flex-col items-center gap-2 group">
                  <Zap className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-medium text-purple-400">Deploy</span>
                </button>
              </div>

              <button className="w-full py-2 bg-ifk-gray-800/50 hover:bg-ifk-cyan-900/20 border border-ifk-gray-700 rounded-lg text-xs font-mono text-ifk-gray-400 hover:text-ifk-cyan-400 transition-all flex items-center justify-center gap-2 group">
                <Plus className="h-3 w-3 group-hover:rotate-90 transition-transform" />
                ADD CUSTOM AGENT
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Command Palette Overlay */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={() => setShowCommandPalette(false)}>
          <div className="w-full max-w-2xl bg-black border border-ifk-cyan-500/30 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.15)] p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-ifk-gray-800 pb-3 mb-3">
              <Command className="h-5 w-5 text-ifk-cyan-500" />
              <input ref={commandInputRef} type="text" placeholder="Execute command..." className="flex-1 bg-transparent outline-none text-lg text-white font-mono placeholder:text-gray-600" />
            </div>
            <div className="h-40 flex items-center justify-center text-gray-600 font-mono text-sm">
              Waiting for input...
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default WorkspacePage;
