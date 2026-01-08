# Client vs Server Actions Guide

## Decision Framework

| Question | Client Action | Server Action |
|----------|--------------|---------------|
| Mutates backend data? | No | **Yes** |
| Needs widget update? | No | **Yes** |
| Navigation only? | **Yes** | No |
| Sends follow-up message? | **Yes** | No |
| Local state change? | **Yes** | No |
| Requires auth context? | No | **Yes** |

## Client Action Flow

```
User clicks → onAction fires → Local processing only
```

```typescript
// Frontend
onAction: async (action, widgetItem) => {
  if (action.type === "open_details") {
    navigate(`/details/${action.payload?.id}`);
  }
  if (action.type === "more") {
    await chatkit.sendUserMessage({ text: "More please" });
  }
}
```

## Server Action Flow

```
User clicks → onAction fires → sendCustomAction → Backend action() → Widget update/message
```

```typescript
// Frontend - forward to server
onAction: async (action, widgetItem) => {
  if (action.type === "approve") {
    await chatkit.sendCustomAction(action, widgetItem.id);
  }
}
```

```python
# Backend - handle and respond
async def action(self, thread, action, sender, context):
    if action.type == "approve":
        # 1. Mutate data
        await self.db.approve(action.payload["id"])

        # 2. Update widget
        updated_widget = build_widget(approved=True)
        yield ThreadItemReplacedEvent(
            item=sender.model_copy(update={"widget": updated_widget})
        )

        # 3. Send confirmation message
        yield ThreadItemDoneEvent(
            item=AssistantMessageItem(content=[{"text": "Approved!"}])
        )
```

## Hybrid Pattern

When action needs both local and server handling:

```typescript
onAction: async (action, widgetItem) => {
  if (action.type === "select_name") {
    // 1. Forward to server for data persistence
    await chatkit.sendCustomAction(action, widgetItem.id);

    // 2. Local state refresh after server processes
    const data = await refreshLocalState();
    updateUI(data);
  }
}
```

## Widget Template Handler Declaration

```json
// Client-handled
"onClickAction": {
  "type": "open_link",
  "handler": "client",
  "payload": { "url": "/page" }
}

// Server-handled
"onClickAction": {
  "type": "submit_form",
  "handler": "server",
  "payload": { "formId": "123" }
}
```

## Common Patterns

### Navigation (Client)
```json
{ "type": "view_details", "handler": "client", "payload": { "id": "123" } }
```

### Selection with State Update (Server)
```json
{ "type": "select_option", "handler": "server", "payload": { "optionId": "abc" } }
```

### Follow-up Message (Client)
```typescript
// In onAction handler
await chatkit.sendUserMessage({ text: "Tell me more about this" });
```

### Data Mutation + Widget Update (Server)
```python
# In action() handler
await db.update(...)
yield ThreadItemReplacedEvent(item=updated_widget)
yield ThreadItemDoneEvent(item=confirmation_message)
```
