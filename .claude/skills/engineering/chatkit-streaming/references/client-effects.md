# Client Effects Reference

## Overview

Client effects are fire-and-forget messages from the server to the client. They update UI state without expecting a response.

## Effect Types by Use Case

### UI State Updates

```python
# Update application state
yield ClientEffectEvent(
    name="update_state",
    data={"key": "value", "nested": {"data": True}}
)
```

### Notifications

```python
# Show toast/flash message
yield ClientEffectEvent(
    name="show_notification",
    data={
        "message": "Operation completed!",
        "type": "success",  # success, error, warning, info
        "duration": 3000,
    }
)
```

### Navigation

```python
# Trigger navigation
yield ClientEffectEvent(
    name="navigate",
    data={"path": "/dashboard", "replace": False}
)
```

### Focus/Selection

```python
# Focus an element
yield ClientEffectEvent(
    name="focus_element",
    data={"elementId": "station-123", "animate": True}
)
```

### Mode Changes

```python
# Enter special UI mode
yield ClientEffectEvent(
    name="enter_mode",
    data={"mode": "selection", "options": {"multiSelect": True}}
)
```

## Frontend Handler Pattern

```typescript
const effectHandlers: Record<string, (data: any) => void> = {
  update_state: (data) => setState(prev => ({ ...prev, ...data })),
  show_notification: (data) => toast[data.type](data.message),
  navigate: (data) => router.push(data.path),
  focus_element: (data) => focusElement(data.elementId),
  enter_mode: (data) => setMode(data.mode),
};

const chatkit = useChatKit({
  onEffect: ({ name, data }) => {
    const handler = effectHandlers[name];
    if (handler) {
      handler(data);
    } else {
      console.warn(`Unknown effect: ${name}`);
    }
  },
});
```

## Timing Considerations

Effects are processed as they arrive during streaming. For DOM updates, use `requestAnimationFrame`:

```typescript
onEffect: ({ name, data }) => {
  if (name === "add_marker") {
    requestAnimationFrame(() => {
      addMarker(data);
      panToMarker(data.id);
    });
  }
}
```

## Effect vs Tool Decision

| Need | Use |
|------|-----|
| Update UI, don't need response | Client Effect |
| Need client state for AI decision | Client Tool |
| Trigger action, need confirmation | Client Tool |
| Fire-and-forget notification | Client Effect |
