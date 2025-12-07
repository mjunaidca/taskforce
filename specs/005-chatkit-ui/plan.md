# Implementation Plan: TaskFlow ChatKit UI

**Feature Branch**: `005-chatkit-ui`
**Spec Version**: 1.0
**Created**: 2025-12-07
**Status**: Approved

---

## Technical Context

### Current State

| Component | Status | Notes |
|-----------|--------|-------|
| web-dashboard | Exists | Next.js 16, React 19, Tailwind, Better Auth integrated |
| packages/api | Exists | FastAPI backend with tasks, projects, audit routers |
| @openai/chatkit-react | Not installed | Need to add to web-dashboard |
| POST /api/chat | Does NOT exist | Must be created as part of this feature |
| AuthProvider | Exists | Provides user, isAuthenticated, login, logout |
| Better Auth cookies | Working | httpOnly cookies for JWT auth |

### Reference Implementation

The `robolearn-interface/src/components/ChatKitWidget/` provides a battle-tested reference (863 lines). Key patterns to port:

1. **Script Loading Detection**: ChatKit requires external script; wait for `openai-chatkit` custom element
2. **Custom Fetch Interceptor**: Inject auth headers and context metadata
3. **Page Context Extraction**: Extract URL, title, project ID
4. **Text Selection "Ask"**: Optional feature for highlighting text and asking about it

### Key Differences from Reference

| Aspect | robolearn-interface | TaskFlow web-dashboard |
|--------|---------------------|------------------------|
| Framework | Docusaurus (Pages Router) | Next.js 16 (App Router) |
| Auth | Custom OAuth via contexts | httpOnly cookies (AuthProvider) |
| Context | Page context (URL, title) | Project context (project_id) |
| Styling | CSS Modules | Tailwind CSS |
| Backend | Dedicated chatkit_server.py | FastAPI /api/chat endpoint |

---

## Constitution Check

### Principle 1: Every Action MUST Be Auditable

**Status**: COMPLIANT

- Chat messages route through backend `/api/chat`
- Backend invokes MCP tools which create audit entries
- Every task action (create, update, complete) is logged via existing audit service

### Principle 2: Agents Are First-Class Citizens

**Status**: COMPLIANT

- ChatKit provides natural language interface for HUMANS
- Agents use MCP tools directly (not ChatKit)
- This creates PARITY: humans chat, agents use MCP - same underlying tools

### Principle 3: Recursive Task Decomposition

**Status**: SUPPORTED

- Users can say "Break down this task" via chat
- Backend can invoke `add_subtask` MCP tool
- Chat responses can show subtask creation

### Principle 4: Spec-Driven Development

**Status**: COMPLIANT

- This plan follows spec at `specs/005-chatkit-ui/spec.md`
- Implementation generated from spec, not manual coding

### Principle 5: Phase Continuity

**Status**: COMPLIANT

- Uses existing Task, Project, Audit models
- No new data models required (chat uses existing structures)
- Conversation storage uses standard patterns

---

## Architecture Decisions

### Decision 1: ChatKit vs Custom Chat UI

**Options**:
1. Use @openai/chatkit-react (as in robolearn-interface)
2. Build custom chat UI from scratch

**Decision**: Use @openai/chatkit-react

**Rationale**:
- Proven pattern in robolearn-interface
- Handles streaming, message rendering, input management
- Reduces implementation time significantly
- Consistent with OpenAI ecosystem (Agents SDK in backend)

### Decision 2: State Management

**Options**:
1. React Context (ChatContext)
2. Zustand store
3. Component-local state with custom hook

**Decision**: Custom hook (`useChat`) with component-local state

**Rationale**:
- Chat state is localized to ChatWidget
- No need for global state (chat doesn't affect other components)
- Simpler, fewer dependencies
- Matches robolearn-interface pattern

### Decision 3: API Communication

**Options**:
1. Direct fetch to backend `/api/chat`
2. Proxy through Next.js API route `/api/chat`
3. Use existing proxy route `/api/proxy/[...path]`

**Decision**: Proxy through Next.js API route `/api/chat`

**Rationale**:
- Keeps backend URL private
- Handles auth token extraction from httpOnly cookies
- Can add request validation and error normalization
- Better CORS handling

### Decision 4: Project Context Source

**Options**:
1. Extract from URL params via `useParams()`
2. Create ProjectContext provider
3. Pass explicitly via props

**Decision**: Extract from URL via `usePathname()` + `useParams()`

**Rationale**:
- Already available in Next.js App Router
- No new context needed
- Matches spec requirement (FR-020)

---

## Component Architecture

```
ChatWidget (main wrapper)
├── ChatButton (floating button, bottom-right)
├── ChatPanel (expanded panel)
│   ├── ChatHeader (title, context, close button)
│   ├── ChatMessages (message list, scrollable)
│   │   └── MessageBubble (individual messages)
│   │       └── ToolCallDisplay (collapsible tool calls)
│   └── ChatInput (text input, send button)
└── LoginPrompt (overlay for unauthenticated users)
```

### Hook Architecture

```typescript
// useChat.ts
const useChat = (projectId?: number) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (text: string) => { ... }
  const startNewConversation = () => { ... }
  const loadHistory = async () => { ... }

  return { messages, isLoading, error, sendMessage, startNewConversation }
}
```

---

## Implementation Sequence

### Phase 1: Foundation (P1 Stories)

**Goal**: Basic chat that sends messages and receives responses

**Tasks**:
1. Add `@openai/chatkit-react` to web-dashboard
2. Create ChatWidget component structure
3. Create ChatButton (floating button)
4. Create ChatPanel (expandable panel)
5. Create useChat hook (basic message state)
6. Create Next.js API route `/api/chat` (proxy to backend)
7. Create FastAPI `/api/chat` endpoint (placeholder)
8. Integrate ChatKit component with custom fetch
9. Test: send message, receive response

**Files**:
- `web-dashboard/package.json` (add dependency)
- `web-dashboard/src/components/chat/ChatWidget.tsx`
- `web-dashboard/src/components/chat/ChatButton.tsx`
- `web-dashboard/src/components/chat/ChatPanel.tsx`
- `web-dashboard/src/hooks/useChat.ts`
- `web-dashboard/src/app/api/chat/route.ts`
- `packages/api/src/taskflow_api/routers/chat.py`

### Phase 2: Authentication (P1 Stories)

**Goal**: Chat works only for authenticated users

**Tasks**:
1. Add auth check in ChatWidget (use AuthProvider)
2. Create LoginPrompt component
3. Pass auth credentials via fetch interceptor (cookies)
4. Handle 401 in Next.js API route
5. Test: unauthenticated user sees login prompt

**Files**:
- `web-dashboard/src/components/chat/LoginPrompt.tsx`
- `web-dashboard/src/components/chat/ChatWidget.tsx` (update)
- `web-dashboard/src/app/api/chat/route.ts` (update)

### Phase 3: Context Awareness (P2 Stories)

**Goal**: Chat knows which project you're viewing

**Tasks**:
1. Extract project_id from URL in ChatWidget
2. Pass project_id in chat requests
3. Display project context in ChatPanel header
4. Update context on navigation
5. Test: chat on /projects/5 shows "Context: Project 5"

**Files**:
- `web-dashboard/src/components/chat/ChatWidget.tsx` (update)
- `web-dashboard/src/components/chat/ChatHeader.tsx` (new)
- `web-dashboard/src/hooks/useChat.ts` (update)

### Phase 4: Backend Integration (P2 Stories)

**Goal**: Backend processes chat messages and calls MCP tools

**Tasks**:
1. Implement FastAPI `/api/chat` with OpenAI Agents SDK
2. Connect to existing MCP tools (list_tasks, add_task, etc.)
3. Support streaming responses
4. Return tool_calls in response for transparency
5. Test: "Add task: Test" creates task and confirms

**Files**:
- `packages/api/src/taskflow_api/routers/chat.py` (full implementation)
- `packages/api/src/taskflow_api/main.py` (register router)
- `packages/api/pyproject.toml` (add openai-agents-sdk if needed)

### Phase 5: Conversation Persistence (P2 Stories)

**Goal**: Chat history persists across sessions

**Tasks**:
1. Create Conversation model in backend
2. Store messages with conversation_id
3. Load previous messages on chat open
4. Implement "New Conversation" button
5. Test: close tab, reopen, see previous messages

**Files**:
- `packages/api/src/taskflow_api/models/conversation.py` (new)
- `packages/api/src/taskflow_api/schemas/conversation.py` (new)
- `packages/api/src/taskflow_api/routers/chat.py` (update)
- `web-dashboard/src/hooks/useChat.ts` (update)

### Phase 6: Polish (P3 Stories)

**Goal**: Smooth UX, tool call visibility, edge cases

**Tasks**:
1. Smooth open/close animations
2. ToolCallDisplay component (collapsible)
3. Error handling with retry button
4. Empty state with suggested prompts
5. Test all edge cases from spec

**Files**:
- `web-dashboard/src/components/chat/ToolCallDisplay.tsx` (new)
- `web-dashboard/src/components/chat/ChatPanel.tsx` (update)
- `web-dashboard/tailwind.config.ts` (animation if needed)

---

## File Inventory

### New Files (Frontend)

| File | Purpose |
|------|---------|
| `components/chat/ChatWidget.tsx` | Main wrapper, orchestrates all chat components |
| `components/chat/ChatButton.tsx` | Floating button (bottom-right) |
| `components/chat/ChatPanel.tsx` | Expanded chat panel container |
| `components/chat/ChatHeader.tsx` | Panel header with title, context, close |
| `components/chat/ChatMessages.tsx` | Scrollable message list |
| `components/chat/ChatInput.tsx` | Text input with send button |
| `components/chat/ToolCallDisplay.tsx` | Collapsible tool call display |
| `components/chat/LoginPrompt.tsx` | Login overlay for unauthenticated |
| `hooks/useChat.ts` | Chat state management hook |
| `lib/chat-api.ts` | API client for chat endpoint |
| `app/api/chat/route.ts` | Next.js API route proxy |

### New Files (Backend)

| File | Purpose |
|------|---------|
| `routers/chat.py` | FastAPI router for POST /api/chat |
| `models/conversation.py` | Conversation model for persistence |
| `schemas/conversation.py` | Pydantic schemas for conversation |

### Modified Files

| File | Change |
|------|--------|
| `web-dashboard/package.json` | Add @openai/chatkit-react |
| `web-dashboard/src/app/layout.tsx` | Add ChatWidget to layout |
| `packages/api/src/taskflow_api/main.py` | Register chat router |

---

## Test Strategy

### Unit Tests

- `useChat` hook: message state, send, error handling
- `ChatWidget`: auth state, open/close toggle
- `ChatButton`: click handler, visibility

### Integration Tests

- API route: request validation, response parsing
- Auth flow: token handling, 401 response
- Project context: extraction from URL

### E2E Tests (Playwright)

1. Open chat, send message, receive response
2. Unauthenticated user sees login prompt
3. Navigate between projects, context updates
4. Close and reopen, history persists
5. Network error shows retry button

---

## Dependencies

### npm Packages to Add

```bash
cd web-dashboard
pnpm add @openai/chatkit-react
```

### Python Packages (if needed)

```bash
cd packages/api
uv add openai-agents
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ChatKit script loading issues | Medium | High | Script loading detection pattern from robolearn |
| Streaming response complexity | Medium | Medium | Use ChatKit's built-in streaming support |
| Backend agent integration | Low | High | OpenAI Agents SDK well-documented |
| Cookie auth in fetch | Low | Medium | Use credentials: 'include' pattern |

---

## Success Validation

After implementation, validate against spec success criteria:

- [ ] SC-001: Response within 5 seconds
- [ ] SC-002: Chat visible on all dashboard pages
- [ ] SC-003: 100% auth coverage
- [ ] SC-004: Project context in requests
- [ ] SC-005: History persists across sessions
- [ ] SC-006: User-friendly errors
- [ ] SC-007: Smooth 300ms animations
- [ ] SC-008: Add task in under 30 seconds
- [ ] SC-009: Theme matches dashboard
- [ ] SC-010: Works after navigation

---

## Next Steps

1. Run `/sp.tasks` to generate detailed task breakdown
2. Implement Phase 1 (Foundation) first
3. Test incrementally after each phase
4. Use frontend-design skill for UI polish in Phase 6
