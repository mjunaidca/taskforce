# Composer Tools Reference

## Overview

Composer tools add mode-switching buttons in the chat input area, allowing users to change the AI's behavior or focus.

## Frontend Configuration

```typescript
// lib/config.ts
import { ToolOption } from "@openai/chatkit";

export const TOOL_CHOICES: ToolOption[] = [
  {
    id: "event_finder",
    label: "Event finder",
    icon: "calendar",
    placeholderOverride: "Anything happening this weekend?",
    persistent: true,  // Stays selected after sending
  },
  {
    id: "puzzle",
    label: "Coffee break puzzle",
    shortLabel: "Puzzle",  // Shown when selected (compact)
    icon: "atom",
    placeholderOverride: "Give me a puzzle to solve",
    persistent: true,
  },
  {
    id: "search",
    label: "Deep search",
    icon: "search",
    placeholderOverride: "What would you like me to research?",
    persistent: false,  // Resets after sending
  },
];
```

## ChatKit Integration

```typescript
import { useChatKit } from "@openai/chatkit-react";
import { TOOL_CHOICES } from "../lib/config";

const chatkit = useChatKit({
  api: { url: API_URL, domainKey: DOMAIN_KEY },

  composer: {
    tools: TOOL_CHOICES,
    placeholder: "Ask me anything...",
  },
});
```

## Backend Handling

The selected tool is passed as `tool_choice` in the request metadata:

```python
# server.py
class NewsChatKitServer(ChatKitServer):
    async def respond(
        self,
        thread: ThreadMetadata,
        item: UserMessageItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        # Get selected tool from context
        tool_choice = context.get("tool_choice")

        if tool_choice == "event_finder":
            # Use event-finding agent or specialized prompt
            agent = self.event_finder_agent
        elif tool_choice == "puzzle":
            # Use puzzle agent
            agent = self.puzzle_agent
        else:
            # Default agent
            agent = self.default_agent

        result = Runner.run_streamed(agent, input_items, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            yield event
```

## Tool Option Properties

```typescript
interface ToolOption {
  id: string;           // Unique identifier (sent to backend)
  label: string;        // Full display text
  shortLabel?: string;  // Compact text when selected
  icon?: string;        // Icon name (calendar, search, etc.)
  placeholderOverride?: string;  // Replace composer placeholder when selected
  persistent?: boolean; // Stay selected after message sent (default: false)
}
```

## Common Icons

- `calendar` - Events, scheduling
- `search` - Search, research
- `atom` - Science, puzzles
- `sparkle` - AI, magic
- `globe` - Web, world
- `document` - Documents, files
- `lightbulb` - Ideas, tips

## Use Cases

### Mode Switching
```typescript
const MODES: ToolOption[] = [
  { id: "quick", label: "Quick answer", icon: "zap" },
  { id: "detailed", label: "Detailed analysis", icon: "document" },
];
```

### Feature Selection
```typescript
const FEATURES: ToolOption[] = [
  { id: "code", label: "Write code", icon: "code" },
  { id: "explain", label: "Explain concept", icon: "lightbulb" },
  { id: "review", label: "Review code", icon: "check" },
];
```

### Agent Routing
```typescript
const AGENTS: ToolOption[] = [
  { id: "support", label: "Customer support", icon: "headset" },
  { id: "sales", label: "Sales inquiry", icon: "dollar" },
  { id: "technical", label: "Technical help", icon: "wrench" },
];
```

## Evidence

- `news-guide/frontend/src/lib/config.ts:51-70` - Tool choices definition
- `news-guide/frontend/src/components/ChatKitPanel.tsx` - Composer integration
- `news-guide/backend/app/server.py` - Backend tool_choice routing
