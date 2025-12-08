# Client Tools Reference

## Overview

Client tools allow the AI to read state from the frontend during response generation. Unlike client effects (fire-and-forget), client tools pause the AI response to query the client.

## How It Works

1. AI calls a client tool (e.g., `get_selected_stations`)
2. ChatKit pauses response and invokes `onClientTool` callback
3. Frontend returns data synchronously
4. AI continues response with the data

## Frontend Configuration

```typescript
import { useChatKit } from "@openai/chatkit-react";

const chatkit = useChatKit({
  api: { url: API_URL, domainKey: DOMAIN_KEY },

  // Handle AI requests for client state
  onClientTool: ({ name, params }) => {
    // Return current selected items
    if (name === "get_selected_stations") {
      return { stationIds: selectedStationIds };
    }

    // Return current view state
    if (name === "get_current_view") {
      return {
        zoom: currentZoom,
        center: currentCenter,
        bounds: mapBounds,
      };
    }

    // Return form values
    if (name === "get_form_data") {
      return {
        name: formState.name,
        email: formState.email,
        preferences: formState.preferences,
      };
    }

    // Return filtered list
    if (name === "get_visible_items") {
      return {
        items: items.filter(item => item.visible),
        count: items.length,
      };
    }
  },
});
```

## Backend Tool Definition

The AI uses client tools via the OpenAI Responses API:

```python
# In your agent definition
from agents import Agent, ResponsesClient

agent = Agent(
    model="gpt-4o",
    tools=[
        {
            "type": "client",  # Client tool type
            "name": "get_selected_stations",
            "description": "Get the station IDs currently selected on the canvas",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
        {
            "type": "client",
            "name": "get_current_view",
            "description": "Get the current map view (zoom, center, bounds)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    ],
)
```

## Common Patterns

### Get Selection State
```typescript
onClientTool: ({ name }) => {
  if (name === "get_selection") {
    return { selectedIds: selection.map(s => s.id) };
  }
}
```

### Get Filter/Search State
```typescript
onClientTool: ({ name }) => {
  if (name === "get_filters") {
    return {
      search: searchQuery,
      category: selectedCategory,
      dateRange: dateFilter,
    };
  }
}
```

### Get Canvas/Editor State
```typescript
onClientTool: ({ name }) => {
  if (name === "get_canvas_state") {
    return {
      objects: canvas.getObjects().map(obj => ({
        id: obj.id,
        type: obj.type,
        position: { x: obj.left, y: obj.top },
      })),
    };
  }
}
```

### Get User Preferences
```typescript
onClientTool: ({ name }) => {
  if (name === "get_preferences") {
    return {
      theme: userPreferences.theme,
      language: userPreferences.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}
```

## Difference from Client Effects

| Aspect | Client Tools | Client Effects |
|--------|--------------|----------------|
| Direction | AI reads client | Server pushes to client |
| Response | Synchronous return value | Fire-and-forget |
| Use case | Get current state | Update UI state |
| Blocks AI | Yes, pauses until response | No |

## Evidence

- `metro-map/frontend/src/components/ChatKitPanel.tsx:119-128` - onClientTool handler
- `metro-map/backend/app/server.py` - Client tool definitions in agent
