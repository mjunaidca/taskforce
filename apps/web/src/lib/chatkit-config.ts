/**
 * Centralized ChatKit Configuration for TaskFlow Agentic UI
 *
 * This module provides helpers for ChatKit configuration:
 * - Streaming state types
 * - Entity tagging handlers for @mentions
 * - Composer tool configurations
 */

/**
 * Streaming state for UI locking
 */
export interface StreamingState {
  isResponding: boolean;
  progressMessage: string | null;
}

/**
 * Entity for @mention autocomplete
 */
export interface MemberEntity {
  id: string;
  name: string;
  type: "human" | "agent";
  icon: "user" | "bot";
  description?: string;
  group: "Team Members" | "AI Agents";
}

/**
 * Create entity tagging handlers for @mentions
 * Returns handlers that can be spread into useChatKit entities config
 */
export function createEntityTaggingHandlers(projectId?: number) {
  return {
    onTagSearch: async (query: string): Promise<MemberEntity[]> => {
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (projectId) params.set("project_id", projectId.toString());

        // Use proxy route which handles auth
        const response = await fetch(`/api/proxy/members/search?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch members");
        }

        const data = await response.json();
        return data.members.map(
          (member: {
            id: string;
            name: string;
            type: "human" | "agent";
            description?: string;
          }): MemberEntity => ({
            id: member.id,
            name: member.name,
            type: member.type,
            icon: member.type === "agent" ? "bot" : "user",
            description: member.description,
            group: member.type === "agent" ? "AI Agents" : "Team Members",
          })
        );
      } catch (error) {
        console.error("[ChatKit] Entity search error:", error);
        return [];
      }
    },

    onClick: (entity: MemberEntity) => {
      console.log("[ChatKit] Entity clicked:", entity);
      // Could open a popup or navigate to worker profile
    },

    onRequestPreview: async (entity: MemberEntity) => {
      // Return preview content for hover popup
      return {
        title: entity.name,
        subtitle: entity.type === "agent" ? "AI Agent" : "Team Member",
        description: entity.description || "No description available",
        icon: entity.icon,
      };
    },
  };
}

/**
 * Composer tool configuration for mode switching
 * These are provided as reference - actual integration depends on ChatKit version
 */
export const composerTools = [
  {
    id: "tasks",
    name: "Tasks",
    icon: "checkbox",
    pinned: true,
    placeholderOverride: "What tasks need attention?",
    metadata: { mode: "task_focused" },
  },
  {
    id: "projects",
    name: "Projects",
    icon: "folder",
    pinned: true,
    placeholderOverride: "Ask about your projects...",
    metadata: { mode: "project_focused" },
  },
  {
    id: "quick_actions",
    name: "Quick Actions",
    icon: "bolt",
    pinned: false,
    placeholderOverride: "Quick action or command...",
    metadata: { mode: "action_focused" },
  },
];
