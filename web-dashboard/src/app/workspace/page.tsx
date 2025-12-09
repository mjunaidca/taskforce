"use client";

/**
 * Agent Workspace - AI Command Center
 *
 * Not just a chat interface - a mission control for AI-assisted work.
 *
 * Design Philosophy:
 * - Chat is ONE panel, not the whole interface
 * - Live context awareness (what you're working on)
 * - Quick actions are first-class citizens
 * - Stats and progress visible at a glance
 * - Feels like piloting, not typing
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { ProjectRead, TaskListItem } from "@/types";
import Link from "next/link";
import {
  Bot,
  ChevronDown,
  Command,
  FolderKanban,
  LayoutGrid,
  Sparkles,
  Zap,
  CheckSquare,
  ArrowRight,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Activity,
} from "lucide-react";

const isBrowser = typeof window !== "undefined";

// Action cards - the primary interface, not the chat
const ACTION_CARDS = [
  {
    id: "tasks",
    icon: CheckSquare,
    label: "View Tasks",
    prompt: "Show my tasks",
    description: "See all your current work",
    gradient: "from-cyan-500/20 to-blue-500/20",
    border: "border-cyan-500/30",
    iconColor: "text-cyan-400",
  },
  {
    id: "create",
    icon: Plus,
    label: "New Task",
    prompt: "I want to create a new task",
    description: "Add something to your list",
    gradient: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    id: "status",
    icon: Activity,
    label: "Status Report",
    prompt: "Give me a status update on my work",
    description: "Progress across projects",
    gradient: "from-emerald-500/20 to-green-500/20",
    border: "border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  {
    id: "blocked",
    icon: AlertCircle,
    label: "Blockers",
    prompt: "What tasks are blocked or overdue?",
    description: "Issues needing attention",
    gradient: "from-rose-500/20 to-red-500/20",
    border: "border-rose-500/30",
    iconColor: "text-rose-400",
  },
];

export default function WorkspacePage() {
  const { user, isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectRead | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [scriptStatus, setScriptStatus] = useState<"pending" | "ready" | "error">(
    isBrowser && window.customElements?.get("openai-chatkit") ? "ready" : "pending"
  );
  const commandInputRef = useRef<HTMLInputElement>(null);
  const projectPickerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // ChatKit proxy endpoint
  const chatkitProxyUrl = "/api/chatkit";
  const effectiveDomainKey = process.env.NEXT_PUBLIC_CHATKIT_DOMAIN_KEY || "domain_pk_local_dev";

  // Load projects and tasks
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        const projectsData = await api.getProjects({ limit: 10 });
        if (isMountedRef.current) {
          setProjects(projectsData);
          if (projectsData.length > 0 && !selectedProject) {
            setSelectedProject(projectsData[0]);
            // Load tasks for first project
            const tasks = await api.getProjectTasks(projectsData[0].id, { limit: 5 });
            setRecentTasks(tasks);
          }
        }
      } catch (error) {
        console.error("[Workspace] Failed to load data:", error);
      }
    }

    fetchData();
  }, [isAuthenticated]); // selectedProject removed - only set on initial load

  // Load tasks when project changes
  useEffect(() => {
    if (!selectedProject) return;

    const projectId = selectedProject.id;
    async function fetchTasks() {
      try {
        const tasks = await api.getProjectTasks(projectId, { limit: 5 });
        if (isMountedRef.current) {
          setRecentTasks(tasks);
        }
      } catch (error) {
        console.error("[Workspace] Failed to load tasks:", error);
      }
    }

    fetchTasks();
  }, [selectedProject]);

  // Wait for ChatKit custom element
  useEffect(() => {
    if (!isBrowser) return;

    if (window.customElements?.get("openai-chatkit")) {
      setScriptStatus("ready");
      return;
    }

    customElements.whenDefined("openai-chatkit").then(() => {
      if (isMountedRef.current) {
        setScriptStatus("ready");
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowCommandPalette(false);
        setShowProjectPicker(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close project picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectPickerRef.current && !projectPickerRef.current.contains(e.target as Node)) {
        setShowProjectPicker(false);
      }
    };

    if (showProjectPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProjectPicker]);

  // Focus command input when palette opens
  useEffect(() => {
    if (showCommandPalette && commandInputRef.current) {
      commandInputRef.current.focus();
    }
  }, [showCommandPalette]);

  // Get page context for ChatKit
  const getPageContext = useCallback(() => {
    return {
      url: window.location.href,
      title: "Agent Workspace",
      path: "/workspace",
      projectId: selectedProject?.id,
      projectName: selectedProject?.name,
      timestamp: new Date().toISOString(),
    };
  }, [selectedProject]);

  // ChatKit configuration
  const { control, sendUserMessage } = useChatKit({
    api: {
      url: chatkitProxyUrl,
      domainKey: effectiveDomainKey,
      fetch: async (input: RequestInfo | URL, options?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (!isAuthenticated || !user) {
          throw new Error("User must be logged in to use workspace");
        }

        const userId = user.sub;
        const pageContext = getPageContext();

        const userInfo = {
          id: user.sub,
          name: user.name || user.email || "User",
          email: user.email,
          role: user.role,
        };

        let modifiedOptions = { ...options } as RequestInit;
        if (modifiedOptions.body && typeof modifiedOptions.body === "string") {
          try {
            const parsed = JSON.parse(modifiedOptions.body);
            if (parsed.type === "threads.create" && parsed.params?.input) {
              parsed.params.input.metadata = {
                userId: userId,
                userInfo: userInfo,
                pageContext: pageContext,
                ...parsed.params.input.metadata,
              };
              modifiedOptions.body = JSON.stringify(parsed);
            } else if (parsed.type === "threads.run" && parsed.params?.input) {
              if (!parsed.params.input.metadata) {
                parsed.params.input.metadata = {};
              }
              parsed.params.input.metadata.userInfo = userInfo;
              parsed.params.input.metadata.pageContext = pageContext;
              modifiedOptions.body = JSON.stringify(parsed);
            }
          } catch {
            // Ignore if not JSON
          }
        }

        return fetch(url, {
          ...modifiedOptions,
          credentials: "include",
          headers: {
            ...modifiedOptions.headers,
            "X-User-ID": userId,
            "X-Page-URL": pageContext.url,
            "X-Page-Title": pageContext.title,
            "X-Page-Path": pageContext.path,
            "X-Project-ID": selectedProject?.id?.toString() || "",
            "X-Project-Name": selectedProject?.name || "",
            "Content-Type": "application/json",
          },
        });
      },
    },
    theme: {
      colorScheme: "dark",
    },
    startScreen: {
      greeting: "",
      prompts: [],
    },
    composer: {
      placeholder: selectedProject
        ? `Message TaskFlow about ${selectedProject.name}...`
        : "Message TaskFlow...",
    },
    widgets: {
      onAction: async (action: { type: string; payload: any }) => {
        console.log("[Workspace] Widget action received:", action.type, action.payload);

        switch (action.type) {
          case "task.view":
            if (action.payload?.task_id) {
              console.log("[Workspace] Opening task in new tab:", action.payload.task_id);
              window.open(`/tasks/${action.payload.task_id}`, "_blank");
            }
            break;

          case "project.view":
            if (action.payload?.project_id) {
              console.log("[Workspace] Opening project in new tab:", action.payload.project_id);
              window.open(`/projects/${action.payload.project_id}`, "_blank");
            }
            break;

          case "form.cancel":
            console.log("[Workspace] Form cancelled");
            break;

          default:
            console.warn("[Workspace] Unknown client action:", action.type);
        }
      },
    },
    onError: ({ error }) => {
      console.error("[Workspace] ChatKit error:", error);
    },
  });

  // Handle action card click
  const handleAction = useCallback(
    async (prompt: string) => {
      if (sendUserMessage) {
        setIsTyping(true);
        await sendUserMessage({ text: prompt, newThread: false });
        setTimeout(() => setIsTyping(false), 500);
      }
      setShowCommandPalette(false);
    },
    [sendUserMessage]
  );

  // Calculate stats
  const stats = {
    total: recentTasks.length,
    inProgress: recentTasks.filter((t) => t.status === "in_progress").length,
    completed: recentTasks.filter((t) => t.status === "completed").length,
    pending: recentTasks.filter((t) => t.status === "pending").length,
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
              <Bot className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary glow-primary animate-ping" />
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold text-foreground">Initializing</p>
            <p className="text-sm text-muted-foreground mt-1">Connecting to TaskFlow...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center ifk-atmosphere overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 ifk-grid opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" />

        <div className="relative max-w-lg w-full mx-6">
          <div className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-10 text-center space-y-8 animate-fade-in-up">
            {/* Logo */}
            <div className="relative inline-block">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/20 to-secondary/30 mx-auto flex items-center justify-center glow-primary-lg">
                <Bot className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-xl bg-secondary/20 border border-secondary/40 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-secondary" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-4xl font-mono font-bold tracking-tight">
                <span className="text-primary">Task</span>
                <span className="text-foreground">Flow</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Your AI command center for getting work done
              </p>
            </div>

            {/* CTA */}
            <div className="space-y-4 pt-2">
              <button
                onClick={login}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-lg hover:brightness-110 transition-all btn-glow flex items-center justify-center gap-3 group"
              >
                <Zap className="h-5 w-5 group-hover:scale-110 transition-transform" />
                Launch Workspace
                <ArrowUpRight className="h-5 w-5 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
              >
                or continue to traditional dashboard
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 ifk-grid opacity-20" />
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Bar */}
      <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-background/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="font-mono font-bold text-lg">
              <span className="text-primary">Task</span>
              <span className="text-foreground/80">Flow</span>
            </span>
          </Link>

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* Project Picker */}
          <div className="relative" ref={projectPickerRef}>
            <button
              onClick={() => setShowProjectPicker(!showProjectPicker)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-all group"
            >
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium text-sm">
                {selectedProject?.name || "All Projects"}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showProjectPicker ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {showProjectPicker && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in-down z-50">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setSelectedProject(null);
                      setShowProjectPicker(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      !selectedProject ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="text-sm font-medium">All Projects</span>
                  </button>
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setShowProjectPicker(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        selectedProject?.id === project.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <FolderKanban className="h-4 w-4" />
                      <span className="text-sm font-medium truncate flex-1 text-left">{project.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {project.task_count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Command Shortcut */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground"
          >
            <Command className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Command</span>
            <kbd className="text-[10px] bg-background px-1.5 py-0.5 rounded font-mono border border-border">⌘K</kbd>
          </button>

          {/* Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono text-emerald-400">Online</span>
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name || "User"}</p>
              <p className="text-[10px] text-muted-foreground">Developer</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-foreground font-mono font-bold border border-primary/20">
              {user?.name?.[0] || user?.email?.[0] || "U"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Context & Actions */}
        <aside className="w-80 border-r border-border/50 flex flex-col bg-background/40 backdrop-blur-sm">
          {/* Stats Strip */}
          <div className="p-4 border-b border-border/50">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-mono font-bold text-foreground">{stats.inProgress}</p>
                <p className="text-[10px] text-amber-400 font-medium uppercase tracking-wide">Active</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-mono font-bold text-foreground">{stats.pending}</p>
                <p className="text-[10px] text-cyan-400 font-medium uppercase tracking-wide">Pending</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-mono font-bold text-foreground">{stats.completed}</p>
                <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wide">Done</p>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1 mb-3">
              Quick Actions
            </p>
            {ACTION_CARDS.map((card) => (
              <button
                key={card.id}
                onClick={() => handleAction(card.prompt)}
                className={`w-full p-4 rounded-2xl bg-gradient-to-br ${card.gradient} border ${card.border} hover:scale-[1.02] transition-all duration-200 text-left group`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl bg-background/50 flex items-center justify-center ${card.iconColor}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {card.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>

          {/* Recent Tasks */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Recent Tasks
              </p>
              <button
                onClick={() => handleAction("Show all my tasks")}
                className="text-[10px] text-primary hover:text-primary/80 transition-colors"
              >
                View all
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 mx-auto flex items-center justify-center mb-3">
                    <CheckSquare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No tasks yet</p>
                </div>
              ) : (
                recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 hover:border-primary/20 transition-all cursor-pointer group"
                    onClick={() => handleAction(`Tell me about task "${task.title}"`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-2 w-2 rounded-full ${
                        task.status === "completed" ? "bg-emerald-500" :
                        task.status === "in_progress" ? "bg-amber-500" :
                        "bg-cyan-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {task.status.replace("_", " ")} · {task.assignee_handle || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Back to Dashboard */}
          <div className="p-4 border-t border-border/50">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 hover:border-primary/20 transition-all text-muted-foreground hover:text-foreground"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
          </div>
        </aside>

        {/* Right Panel - Chat */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          {/* Chat Header */}
          <div className="h-14 border-b border-border/50 flex items-center justify-between px-6 bg-background/40 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div>
                <p className="font-semibold text-sm">TaskFlow Agent</p>
                <p className="text-[10px] text-muted-foreground">
                  {isTyping ? (
                    <span className="text-primary animate-pulse">Thinking...</span>
                  ) : (
                    "Ready to help"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">
                {selectedProject ? `Context: ${selectedProject.name}` : "Global context"}
              </span>
            </div>
          </div>

          {/* ChatKit */}
          <div className="flex-1 relative">
            {scriptStatus === "ready" ? (
              <ChatKit
                control={control}
                className="h-full w-full"
                style={{
                  borderRadius: 0,
                  background: "transparent",
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm font-mono">Connecting to agent...</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => setShowCommandPalette(false)}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

          <div
            className="relative w-full max-w-xl mx-4 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <Command className="h-5 w-5 text-primary" />
              <input
                ref={commandInputRef}
                type="text"
                placeholder="Ask TaskFlow anything..."
                className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const value = (e.target as HTMLInputElement).value;
                    if (value.trim()) {
                      handleAction(value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <kbd className="text-[10px] bg-muted px-2 py-1 rounded-lg font-mono text-muted-foreground border border-border">
                ESC
              </kbd>
            </div>

            {/* Suggestions */}
            <div className="p-3 max-h-[50vh] overflow-y-auto">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-2 py-2">
                Suggestions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ACTION_CARDS.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleAction(card.prompt)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted text-left transition-colors"
                  >
                    <div className={`h-9 w-9 rounded-lg bg-muted flex items-center justify-center ${card.iconColor}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{card.label}</p>
                      <p className="text-[10px] text-muted-foreground">{card.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
