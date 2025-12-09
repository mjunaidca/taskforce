"use client";

/**
 * ChatKit Floating Widget Component for TaskFlow
 *
 * A floating chat button that opens/closes ChatKit for task management.
 * Features:
 * - Floating button icon (bottom-right corner)
 * - ChatKit opens/closes on click
 * - Text selection support (Select Text and ASK)
 * - Page/Project context awareness
 * - Script loading (loads CDN script on mount)
 *
 * Based on robolearn-interface implementation, adapted for Next.js App Router
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { useAuth } from "@/components/providers/auth-provider";
import { usePathname, useParams, useRouter } from "next/navigation";
import styles from "./styles.module.css";
import { ProgressIndicator } from "./ProgressIndicator";
import { ContextBadge } from "./ContextBadge";
import { type StreamingState } from "@/lib/chatkit-config";

const isBrowser = typeof window !== "undefined";


interface ChatKitWidgetProps {
  backendUrl?: string;
  domainKey?: string;
}

export function ChatKitWidget({
  backendUrl,
  domainKey,
}: ChatKitWidgetProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionPosition, setSelectionPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showPersonalizeMenu, setShowPersonalizeMenu] = useState(false);
  const [scriptStatus, setScriptStatus] = useState<
    "pending" | "ready" | "error"
  >(
    isBrowser && window.customElements?.get("openai-chatkit")
      ? "ready"
      : "pending"
  );
  const selectionRef = useRef<HTMLDivElement>(null);
  const personalizeMenuRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Streaming state for UI locking and progress
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isResponding: false,
    progressMessage: null,
  });

  // Project context for scoping
  const [projectContext, setProjectContext] = useState<{
    id?: number;
    name?: string;
  }>({});

  const { user, isAuthenticated, isLoading: authLoading, login } = useAuth();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  // Use dedicated ChatKit proxy endpoint - handles auth via httpOnly cookies
  // The proxy at /api/chatkit will forward to the backend /chatkit with Authorization header
  const chatkitProxyUrl = "/api/chatkit";

  // Domain key for ChatKit (required for whitelabeled domains)
  const effectiveDomainKey =
    domainKey ||
    process.env.NEXT_PUBLIC_CHATKIT_DOMAIN_KEY ||
    "domain_pk_local_dev";

  // Extract project ID from URL path
  const projectId = (() => {
    if (typeof params?.id === "string") {
      const parsed = parseInt(params.id, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    const match = pathname?.match(/\/projects\/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  })();

  // Sync project context from URL changes and fetch project name
  useEffect(() => {
    if (projectId) {
      setProjectContext((prev) => ({
        ...prev,
        id: projectId,
        name: prev.id === projectId ? prev.name : undefined, // Keep existing name if same project
      }));

      // Fetch project name from API
      const fetchProjectName = async () => {
        try {
          const response = await fetch(`/api/proxy/projects/${projectId}`, {
            credentials: "include",
          });
          if (response.ok) {
            const project = await response.json();
            if (isMountedRef.current && project.name) {
              setProjectContext((prev) => ({
                ...prev,
                name: project.name,
              }));
            }
          }
        } catch (error) {
          console.warn("[ChatKit] Failed to fetch project name:", error);
          // Keep using placeholder on error
          if (isMountedRef.current) {
            setProjectContext((prev) => ({
              ...prev,
              name: prev.name || `Project ${projectId}`,
            }));
          }
        }
      };

      fetchProjectName();
    }
  }, [projectId]);

  // Wait for ChatKit custom element to be defined (script loaded via layout.tsx)
  useEffect(() => {
    if (!isBrowser) return;

    // Already registered
    if (window.customElements?.get("openai-chatkit")) {
      setScriptStatus("ready");
      return;
    }

    // Wait for custom element to be defined
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

  // Get current page context
  const getPageContext = useCallback(() => {
    if (typeof window === "undefined") return null;

    const metaDescription =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") || "";

    const mainContent =
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.querySelector('[role="main"]') ||
      document.body;

    const headings = Array.from(mainContent.querySelectorAll("h1, h2, h3"))
      .slice(0, 5)
      .map((h) => h.textContent?.trim())
      .filter(Boolean)
      .join(", ");

    return {
      url: window.location.href,
      title: document.title,
      path: window.location.pathname,
      description: metaDescription,
      headings: headings,
      projectId: projectId,
      timestamp: new Date().toISOString(),
    };
  }, [projectId]);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setSelectedText("");
        setSelectionPosition(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0) {
        setSelectedText(text);

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
      } else {
        setSelectedText("");
        setSelectionPosition(null);
      }
    };

    document.addEventListener("selectionchange", handleSelection);
    document.addEventListener("mouseup", handleSelection);

    return () => {
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("mouseup", handleSelection);
    };
  }, []);

  // ChatKit configuration - routes through /api/chatkit which adds Authorization header
  const { control, sendUserMessage } = useChatKit({
    api: {
      url: chatkitProxyUrl,
      domainKey: effectiveDomainKey,

      // Custom fetch to inject context (auth handled by proxy via httpOnly cookies)
      fetch: async (input: RequestInfo | URL, options?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        console.log("[ChatKit] Fetch request to:", url);
        console.log("[ChatKit] Request method:", options?.method || "GET");

        if (!isAuthenticated) {
          console.error("[ChatKit] User not authenticated");
          throw new Error("User must be logged in to use chat");
        }

        const userId = user!.sub;
        const pageContext = getPageContext();
        console.log("[ChatKit] User ID:", userId);
        console.log("[ChatKit] Page context:", pageContext?.path);

        const userInfo = {
          id: user!.sub,
          name: user!.name || user!.email || "User",
          email: user!.email,
          role: user!.role,
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

        // Log request body for debugging
        if (modifiedOptions.body) {
          try {
            const bodyPreview = JSON.parse(modifiedOptions.body as string);
            console.log("[ChatKit] Request type:", bodyPreview.type);
          } catch {
            console.log("[ChatKit] Request body (non-JSON)");
          }
        }

        const response = await fetch(url, {
          ...modifiedOptions,
          credentials: "include", // Include cookies for proxy auth
          headers: {
            ...modifiedOptions.headers,
            "X-User-ID": userId,
            "X-Page-URL": pageContext?.url || "",
            "X-Page-Title": pageContext?.title || "",
            "X-Page-Path": pageContext?.path || "",
            "X-Project-ID": projectId?.toString() || "",
            "Content-Type": "application/json",
          },
        });

        console.log("[ChatKit] Response status:", response.status);
        console.log("[ChatKit] Response ok:", response.ok);

        if (!response.ok) {
          // Try to get error details from response
          const contentType = response.headers.get("content-type");
          console.error("[ChatKit] Response failed, content-type:", contentType);
          try {
            const errorText = await response.clone().text();
            console.error("[ChatKit] Error response body:", errorText.substring(0, 500));
          } catch {
            console.error("[ChatKit] Could not read error response body");
          }
        }

        return response;
      },
    },
    theme: {
      colorScheme: "dark",
    },
    startScreen: {
      greeting: "Welcome to TaskFlow Assistant!",
      prompts: [
        {
          label: "My Tasks",
          prompt: "What tasks do I have?",
          icon: "sparkle",
        },
        {
          label: "Add Task",
          prompt: "Help me add a new task",
          icon: "square-code",
        },
        {
          label: "Status",
          prompt: "What's the status of my work?",
          icon: "circle-question",
        },
      ],
    },
    composer: {
      placeholder: "Ask about your tasks...",
    },
    widgets: {
      onAction: async (action: { type: string; payload: any }) => {
        console.log("[ChatKit] Action received:", action.type, action.payload);

        switch (action.type) {
          case "task.view":
            if (action.payload?.task_id) {
              console.log("[ChatKit] Navigating to task:", action.payload.task_id);
              // Open in new tab
              window.open(`/tasks/${action.payload.task_id}`, "_blank");
            }
            break;

          case "project.view":
            if (action.payload?.project_id) {
              console.log("[ChatKit] Navigating to project:", action.payload.project_id);
              // Open in new tab
              window.open(`/projects/${action.payload.project_id}`, "_blank");
            }
            break;

          case "form.cancel":
            // Form cancel may be handled by ChatKit automatically
            console.log("[ChatKit] Form cancelled");
            break;

          default:
            console.warn("[ChatKit] Unknown client action:", action.type);
        }
      },
    },
    onError: ({ error }) => {
      console.error("[ChatKit] Error received:", error);
      console.error("[ChatKit] Error name:", error?.name);
      console.error("[ChatKit] Error message:", error?.message);
      console.error("[ChatKit] Full error object:", JSON.stringify(error, null, 2));
      // Reset streaming state on error
      setStreamingState({ isResponding: false, progressMessage: null });
    },
  });

  // Track response state for UI updates
  // Note: ChatKit's streaming handlers may vary by version
  // The component tracks streaming state locally based on control state

  // Handle "Ask" button click for selected text
  const handleAskSelectedText = useCallback(async () => {
    if (!selectedText || !isAuthenticated) return;

    if (!isOpen) {
      setIsOpen(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const pageContext = getPageContext();
    let messageText = "";

    if (pageContext) {
      messageText = `Can you help me with this from "${pageContext.title}":\n\n"${selectedText}"`;
    } else {
      messageText = `Can you help me with this:\n\n"${selectedText}"`;
    }

    try {
      if (sendUserMessage) {
        await sendUserMessage({
          text: messageText,
          newThread: false,
        });

        setTimeout(() => {
          window.getSelection()?.removeAllRanges();
          setSelectedText("");
          setSelectionPosition(null);
        }, 200);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [selectedText, isOpen, isAuthenticated, sendUserMessage, getPageContext]);

  // Close ChatKit when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        target.closest(`.${styles.chatKitContainer}`) ||
        target.closest(`.${styles.chatButton}`)
      ) {
        return;
      }

      setIsOpen(false);
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close selection on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectionRef.current &&
        !selectionRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;
        if (target.closest(`.${styles.chatKitContainer}`)) {
          return;
        }
        setSelectedText("");
        setSelectionPosition(null);
      }
    };

    if (selectedText) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [selectedText]);

  // Handle chat button click
  const handleChatButtonClick = useCallback(() => {
    if (!isAuthenticated) {
      login();
      return;
    }

    setIsOpen(!isOpen);
    setShowPersonalizeMenu(false);
  }, [isAuthenticated, isOpen, login]);

  // Handle personalize menu actions
  const handlePersonalize = useCallback(() => {
    setShowPersonalizeMenu(false);
    setIsOpen(true);
    setTimeout(async () => {
      if (sendUserMessage) {
        await sendUserMessage({
          text: "How can I customize my task workflow?",
          newThread: false,
        });
      }
    }, 500);
  }, [sendUserMessage]);

  const handleShowTasks = useCallback(() => {
    setShowPersonalizeMenu(false);
    setIsOpen(true);
    setTimeout(async () => {
      if (sendUserMessage) {
        await sendUserMessage({
          text: "Show me all my tasks",
          newThread: false,
        });
      }
    }, 500);
  }, [sendUserMessage]);

  // Close personalize menu on outside click
  useEffect(() => {
    if (!showPersonalizeMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        personalizeMenuRef.current &&
        !personalizeMenuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(`.${styles.chatButton}`)
      ) {
        setShowPersonalizeMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPersonalizeMenu]);

  // Don't render during auth loading
  if (authLoading) {
    return <></>;
  }

  return (
    <>
      {/* Floating Chat Button and Settings */}
      <div className={styles.chatButtonContainer}>
        {/* Settings Button - Visible when logged in */}
        {isAuthenticated && (
          <button
            className={styles.settingsButton}
            onClick={() => setShowPersonalizeMenu(!showPersonalizeMenu)}
            aria-label="Personalize Assistant"
            title="Personalize Assistant"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
          </button>
        )}

        <button
          className={styles.chatButton}
          onClick={handleChatButtonClick}
          aria-label={
            isAuthenticated
              ? "Open TaskFlow Assistant"
              : "Login to use TaskFlow Assistant"
          }
          title={
            isAuthenticated
              ? "Open TaskFlow Assistant"
              : "Login to use TaskFlow Assistant"
          }
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Personalize Menu */}
        {showPersonalizeMenu && isAuthenticated && (
          <div ref={personalizeMenuRef} className={styles.personalizeMenu}>
            <div className={styles.personalizeMenuHeader}>
              <h4>TaskFlow Assistant</h4>
              <button
                className={styles.closeMenuButton}
                onClick={() => setShowPersonalizeMenu(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <div className={styles.personalizeMenuContent}>
              <p>Quick actions:</p>
              <button
                className={styles.personalizeButton}
                onClick={handleShowTasks}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                View All Tasks
              </button>
              <button
                className={styles.personalizeButton}
                onClick={() => {
                  setShowPersonalizeMenu(false);
                  setIsOpen(true);
                  setTimeout(async () => {
                    if (sendUserMessage) {
                      await sendUserMessage({
                        text: "Show me the task creation form",
                        newThread: false,
                      });
                    }
                  }, 500);
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create New Task
              </button>
              <button
                className={styles.personalizeButton}
                onClick={handlePersonalize}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Customize Workflow
              </button>
              <button
                className={styles.personalizeButton}
                onClick={() => {
                  setShowPersonalizeMenu(false);
                  setIsOpen(true);
                  setTimeout(async () => {
                    if (sendUserMessage) {
                      await sendUserMessage({
                        text: "What can you help me with?",
                        newThread: false,
                      });
                    }
                  }, 500);
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
                Help
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ChatKit Component */}
      {isOpen && scriptStatus === "ready" && isAuthenticated && (
        <div className={`${styles.chatKitContainer} ${streamingState.isResponding ? styles.streamingActive : ""}`}>
          {/* Chat Header with Context Badge */}
          <div className={styles.chatHeader}>
            <span className={styles.chatHeaderTitle}>TaskFlow Assistant</span>
            <div className={styles.chatHeaderActions}>
              <ContextBadge
                projectId={projectContext.id}
                projectName={projectContext.name}
                onClearContext={() => setProjectContext({})}
              />
            </div>
          </div>

          {/* Progress Indicator */}
          <ProgressIndicator
            message={streamingState.progressMessage || "Thinking..."}
            isVisible={streamingState.isResponding}
          />

          <ChatKit
            control={control}
            className={styles.chatKit}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          />
        </div>
      )}

      {/* Login Prompt Overlay */}
      {isOpen && !isAuthenticated && !authLoading && (
        <div className={styles.loginPrompt}>
          <div className={styles.loginPromptContent}>
            <h3>Login Required</h3>
            <p>
              Please log in to use the TaskFlow Assistant and manage your tasks
              with natural language.
            </p>
            <button className={styles.loginButton} onClick={login}>
              Log In
            </button>
            <button
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* "Ask" Button for Selected Text */}
      {selectedText && selectionPosition && isAuthenticated && (
        <div
          ref={selectionRef}
          className={styles.askButton}
          style={{
            left: `${selectionPosition.x}px`,
            top: `${selectionPosition.y}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleAskSelectedText();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Ask</span>
        </div>
      )}
    </>
  );
}
