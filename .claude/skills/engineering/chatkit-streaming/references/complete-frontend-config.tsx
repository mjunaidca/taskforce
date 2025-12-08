/**
 * Complete Frontend Configuration Pattern
 * From: blueprints/openai-chatkit-advanced-samples-main/examples/metro-map/frontend/src/components/ChatKitPanel.tsx
 *
 * This file shows the complete pattern for configuring ChatKit with all streaming and lifecycle features.
 */

import {
  ChatKit,
  useChatKit,
  type Entity,
} from "@openai/chatkit-react";

// =========================================================================
// Configuration Constants
// =========================================================================
const CHATKIT_API_URL = import.meta.env.VITE_CHATKIT_API_URL ?? "/chatkit";
const CHATKIT_API_DOMAIN_KEY =
  import.meta.env.VITE_CHATKIT_API_DOMAIN_KEY ?? "domain_pk_localhost_dev";

// =========================================================================
// Complete useChatKit Configuration
// =========================================================================
export function ChatKitPanel() {
  // Your app state hooks
  const { lockInteraction, unlockInteraction } = useMapStore();
  const { setThreadId, setChatkit, theme } = useAppStore();

  // -----------------------------------------------------------------------
  // Entity Search (for @mentions)
  // -----------------------------------------------------------------------
  const searchStations = async (query: string): Promise<Entity[]> => {
    const stations = await fetchStations();
    const normalized = query.trim().toLowerCase();
    if (!normalized) return stations;

    return stations.filter((entity) =>
      entity.title.toLowerCase().includes(normalized)
    );
  };

  // -----------------------------------------------------------------------
  // Client Tool Handler (AI reads client state)
  // -----------------------------------------------------------------------
  const handleClientTool = ({ name, params }: { name: string; params: Record<string, unknown> }) => {
    // AI can request current client state
    if (name === "get_selected_stations") {
      return { stationIds: selectedStationIds };
    }
    if (name === "get_current_view") {
      return { zoom: currentZoom, center: currentCenter };
    }
  };

  // -----------------------------------------------------------------------
  // Client Effect Handler (server pushes UI updates)
  // -----------------------------------------------------------------------
  const handleClientEffect = ({ name, data }: { name: string; data: Record<string, unknown> }) => {
    if (name === "location_select_mode") {
      setLocationSelectLineId(data.lineId as string);
    }
    if (name === "add_station") {
      const nextMap = data.map as MetroMap;
      setMap(nextMap);
      if (data.stationId) {
        focusStation(data.stationId as string);
      }
    }
    if (name === "highlight_items") {
      setHighlighted(data.ids as string[]);
    }
  };

  // -----------------------------------------------------------------------
  // Complete ChatKit Configuration
  // -----------------------------------------------------------------------
  const chatkit = useChatKit({
    // API Configuration
    api: {
      url: CHATKIT_API_URL,
      domainKey: CHATKIT_API_DOMAIN_KEY,
    },

    // Theme Configuration
    theme: {
      density: "spacious",
      colorScheme: theme, // "light" | "dark"
      color: {
        ...(theme === "dark"
          ? {
              surface: {
                background: "#0d1117",
                foreground: "#1d222b",
              },
            }
          : null),
        accent: {
          primary: "#0ea5e9",
          level: 1,
        },
      },
      typography: {
        fontFamily: "OpenAI Sans, sans-serif",
        fontSources: FONT_SOURCES,
      },
      radius: "pill",
    },

    // Header Configuration
    header: {
      title: { enabled: false },
      rightAction: {
        icon: theme === "dark" ? "dark-mode" : "light-mode",
        onClick: () => toggleTheme(),
      },
    },

    // Start Screen (shown before first message)
    startScreen: {
      greeting: "How can I help you today?",
      prompts: [
        { label: "Plan a route", prompt: "Help me plan a route", icon: "globe" },
        { label: "Add station", prompt: "Add a new station", icon: "sparkle" },
      ],
    },

    // Composer Configuration
    composer: {
      placeholder: hasThread ? "Ask a follow-up..." : "What would you like to do?",
    },

    // Entity Tagging (@mentions)
    entities: {
      onTagSearch: searchStations,
      onClick: (entity) => focusStation(entity.id),
    },

    // Thread Item Actions
    threadItemActions: {
      feedback: false, // Disable thumbs up/down
    },

    // =====================================================================
    // STREAMING & LIFECYCLE HANDLERS
    // =====================================================================

    // Called when AI reads client state
    onClientTool: handleClientTool,

    // Called when server pushes UI updates
    onEffect: handleClientEffect,

    // Called when thread changes
    onThreadChange: ({ threadId }) => {
      setThreadId(threadId);
    },

    // Called when ChatKit is ready
    onReady: () => {
      setChatkit(chatkit);
    },

    // Called on any error
    onError: ({ error }) => {
      console.error("ChatKit error", error);
    },

    // =====================================================================
    // RESPONSE LIFECYCLE (UI locking)
    // =====================================================================

    // Called when AI starts responding
    onResponseStart: () => {
      lockInteraction(); // Disable UI during response
    },

    // Called when AI finishes responding
    onResponseEnd: () => {
      unlockInteraction(); // Re-enable UI
    },
  });

  return (
    <div className="h-full w-full">
      <ChatKit control={chatkit.control} className="h-full w-full" />
    </div>
  );
}
