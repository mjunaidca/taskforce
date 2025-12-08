# Entity Tagging (@mentions) Reference

## Overview

Entity tagging enables users to @mention entities (users, articles, tasks, stations) directly in the chat composer. The AI receives these as structured references.

## Frontend Configuration

```typescript
import { useChatKit, type Entity } from "@openai/chatkit-react";

const chatkit = useChatKit({
  api: { url: API_URL, domainKey: DOMAIN_KEY },

  entities: {
    // Called as user types @...
    onTagSearch: async (query: string): Promise<Entity[]> => {
      const results = await searchEntities(query);
      return results.map(item => ({
        id: item.id,
        title: item.name,
        icon: getIcon(item.type),      // "profile", "document", etc.
        group: getGroup(item.type),    // "People", "Articles"
        interactive: true,
        data: {                        // Custom data passed to handlers
          type: item.type,
          url: item.url,
        },
      }));
    },

    // Called when user clicks an entity tag
    onClick: (entity: Entity) => {
      if (entity.data?.url) {
        navigate(entity.data.url);
      }
    },

    // Called on hover to show preview card
    onRequestPreview: async (entity: Entity) => {
      const details = await fetchEntityDetails(entity.id);
      return {
        preview: {
          type: "Card",
          children: [
            { type: "Text", value: entity.title, weight: "bold" },
            { type: "Text", value: details.description, color: "tertiary" },
            { type: "Text", value: `Type: ${entity.data?.type}`, size: "sm" },
          ],
        },
      };
    },
  },
});
```

## Entity Interface

```typescript
interface Entity {
  id: string;           // Unique identifier
  title: string;        // Display name
  icon?: string;        // Icon name (profile, document, etc.)
  group?: string;       // Grouping label
  interactive?: boolean; // Clickable?
  data?: Record<string, unknown>; // Custom data
}
```

## Backend Conversion

Convert entity tags to model-readable markers:

```python
# thread_item_converter.py
from chatkit.types import UserMessageItem, EntityTag

class EntityAwareConverter:
    """Convert entity tags to XML markers for agent."""

    async def to_agent_input(self, items: list) -> list:
        result = []
        for item in items:
            if isinstance(item, UserMessageItem):
                content = self._process_entities(item)
                result.append({"role": "user", "content": content})
        return result

    def _process_entities(self, item: UserMessageItem) -> str:
        content = item.content
        for entity in item.entities or []:
            marker = self._entity_to_marker(entity)
            content = content.replace(f"@{entity.title}", marker)
        return content

    def _entity_to_marker(self, entity: EntityTag) -> str:
        if entity.data.get("type") == "article":
            return f"<ARTICLE_REFERENCE id='{entity.id}'>{entity.title}</ARTICLE_REFERENCE>"
        if entity.data.get("type") == "user":
            return f"<USER_REFERENCE id='{entity.id}'>{entity.title}</USER_REFERENCE>"
        if entity.data.get("type") == "station":
            return f"<STATION_TAG id='{entity.id}'>{entity.title}</STATION_TAG>"
        return f"<ENTITY id='{entity.id}'>{entity.title}</ENTITY>"
```

## Agent Instructions

Include in system prompt:

```
When you see entity references like <ARTICLE_REFERENCE id='...'>Title</ARTICLE_REFERENCE>,
use the get_article_by_id tool to fetch the full content before answering questions about it.
```

## Preview Widget Types

```typescript
// Simple text preview
{
  preview: {
    type: "Card",
    children: [
      { type: "Text", value: "Title", weight: "bold" },
      { type: "Text", value: "Description", color: "tertiary" },
    ],
  },
}

// Preview with image
{
  preview: {
    type: "Card",
    children: [
      { type: "Image", src: imageUrl, height: 100, fit: "cover" },
      { type: "Text", value: "Title", weight: "bold" },
    ],
  },
}
```

## Common Use Cases

### User Mentions
```typescript
onTagSearch: async (query) => {
  const users = await searchUsers(query);
  return users.map(u => ({
    id: u.id,
    title: u.name,
    icon: "profile",
    group: "Team Members",
    data: { type: "user", email: u.email },
  }));
}
```

### Task References
```typescript
onTagSearch: async (query) => {
  const tasks = await searchTasks(query);
  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    icon: t.completed ? "check" : "dot",
    group: "Tasks",
    data: { type: "task", status: t.status },
  }));
}
```

### Article/Document Mentions
```typescript
onTagSearch: async (query) => {
  const articles = await searchArticles(query);
  return articles.map(a => ({
    id: a.id,
    title: a.title,
    icon: "document",
    group: "Articles",
    data: { type: "article", author: a.author },
  }));
}
```

## Evidence

- `news-guide/frontend/src/components/ChatKitPanel.tsx` - Article/author tagging
- `news-guide/backend/app/thread_item_converter.py` - Entity conversion
- `metro-map/frontend/src/components/ChatKitPanel.tsx:73-117` - Station tagging
