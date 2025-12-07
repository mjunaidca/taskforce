# Feature Specification: TaskFlow ChatKit UI

**Feature Branch**: `005-chatkit-ui`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "ChatKit UI for TaskFlow dashboard - chat widget for natural language task management using OpenAI ChatKit, integrated with FastAPI backend /api/chat endpoint, authenticated via Better Auth JWT"

---

## Executive Summary

TaskFlow ChatKit UI is a floating chat widget integrated into the Next.js web dashboard that enables users to manage tasks through natural language. This is Phase III of the TaskFlow hackathon - enabling humans to interact with the platform naturally while AI agents work autonomously via MCP.

**Core Value**: Users can ask "What tasks do I have?" or "Mark task 3 complete" instead of clicking through UI. The same backend that serves MCP tools for AI agents serves natural language for humans.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Chat and Send Message (Priority: P1)

As a logged-in user viewing the dashboard, I want to click a floating chat button and send a natural language message so that I can manage my tasks conversationally.

**Why this priority**: This is the core interaction loop. Without it, no other features work. Validates ChatKit integration, auth, and backend communication.

**Independent Test**: Can be fully tested by clicking the chat button, typing "What tasks do I have?", and verifying a response appears. Delivers immediate conversational value.

**Acceptance Scenarios**:

1. **Given** I am logged in and on any dashboard page, **When** I click the floating chat button in the bottom-right corner, **Then** a chat panel expands showing a welcome message and input field.
2. **Given** the chat panel is open, **When** I type "What tasks do I have?" and press Enter, **Then** my message appears in the chat, a loading indicator shows, and the assistant responds with my task list.
3. **Given** I send a message, **When** the backend processes it, **Then** the response streams in progressively (not all at once).

---

### User Story 2 - Authenticate Chat Requests (Priority: P1)

As a user, I want the chat to automatically use my authentication credentials so that the assistant can access my tasks and projects securely.

**Why this priority**: Chat is useless without auth - the backend cannot know which user's tasks to show. This validates the JWT token flow through httpOnly cookies.

**Independent Test**: Can be fully tested by sending a chat message and verifying the response contains user-specific data (e.g., "You have 3 tasks in Project Alpha").

**Acceptance Scenarios**:

1. **Given** I am not logged in, **When** I click the chat button, **Then** I see a login prompt instead of the chat panel.
2. **Given** I am logged in, **When** I send a message, **Then** the request includes my authentication credentials automatically.
3. **Given** my session expires while chatting, **When** I send a message, **Then** I am prompted to log in again (not a cryptic error).

---

### User Story 3 - Project Context Awareness (Priority: P2)

As a user viewing a specific project, I want the chat to know which project I'm looking at so that questions like "Add a task" go to the right project.

**Why this priority**: Context awareness makes the chat intelligent. Without it, users must specify project in every message. High value but requires P1 working first.

**Independent Test**: Can be tested by navigating to `/projects/123`, opening chat, saying "Add task: Review docs", and verifying the task is created in project 123.

**Acceptance Scenarios**:

1. **Given** I am viewing `/projects/5`, **When** I open the chat, **Then** the panel shows "Context: Project Alpha" indicator.
2. **Given** I am in a project context, **When** I say "What tasks are pending?", **Then** the response shows only tasks from that project.
3. **Given** I am on the main dashboard (no specific project), **When** I ask about tasks, **Then** the response shows all my tasks across projects.
4. **Given** I navigate to a different project while chat is open, **When** I send a new message, **Then** the context updates to the new project.

---

### User Story 4 - Conversation Persistence (Priority: P2)

As a user, I want my conversation history to persist so that I can continue where I left off.

**Why this priority**: Without persistence, every chat open starts fresh. Users lose context. Requires backend conversation storage.

**Independent Test**: Can be tested by having a conversation, closing the chat, reopening, and seeing previous messages.

**Acceptance Scenarios**:

1. **Given** I have an existing conversation, **When** I close and reopen the chat panel, **Then** my previous messages are visible.
2. **Given** I want a fresh start, **When** I click "New Conversation", **Then** a new thread begins and previous messages are cleared from view.
3. **Given** I have multiple conversations, **When** I start a new one, **Then** the old conversation is preserved (not deleted).

---

### User Story 5 - Task Management via Chat (Priority: P2)

As a user, I want to create, update, and complete tasks through natural language commands.

**Why this priority**: This is the "magic" - the reason to use chat. But requires P1 (messaging) and P2 (context) to be meaningful.

**Independent Test**: Can be tested by saying "Add task: Buy groceries", verifying it appears in the task list, then saying "Complete task 1" and verifying the status changes.

**Acceptance Scenarios**:

1. **Given** I say "Add a task: Write documentation", **When** the assistant processes it, **Then** a new task is created in the current project and the assistant confirms with the task ID.
2. **Given** I say "Mark task 5 as complete", **When** the task exists and I have permission, **Then** the task status changes to completed and the assistant confirms.
3. **Given** I say "What's the status of my tasks?", **When** I have tasks assigned to me, **Then** the assistant lists tasks grouped by status (pending, in-progress, completed).
4. **Given** I say "Assign task 3 to @claude-code", **When** @claude-code is a project member, **Then** the task is assigned and confirmed.

---

### User Story 6 - Close and Toggle Chat (Priority: P3)

As a user, I want to easily open and close the chat without losing my conversation.

**Why this priority**: Basic UX polish. Chat should not block the dashboard. Lower priority as core functionality must work first.

**Independent Test**: Can be tested by opening chat, minimizing, verifying dashboard is usable, then reopening and seeing conversation intact.

**Acceptance Scenarios**:

1. **Given** the chat is open, **When** I click the close button or the chat button again, **Then** the panel closes smoothly.
2. **Given** the chat is closed, **When** I click the floating button, **Then** the panel opens with previous conversation visible.
3. **Given** I am in the middle of receiving a response, **When** I close the chat, **Then** the response continues streaming and is visible when I reopen.

---

### User Story 7 - Tool Call Visibility (Priority: P3)

As an advanced user, I want to optionally see what tools the assistant is calling so I understand what actions are being taken.

**Why this priority**: Transparency feature for power users. Most users don't need it. Nice-to-have for debugging and trust.

**Independent Test**: Can be tested by enabling "Show tool calls", sending a task command, and seeing "Called: add_task" in the response.

**Acceptance Scenarios**:

1. **Given** tool call visibility is enabled, **When** the assistant calls a backend tool, **Then** I see a collapsible section showing the tool name and parameters.
2. **Given** tool call visibility is disabled (default), **When** the assistant uses tools, **Then** I only see the natural language response.

---

### Edge Cases

- **Network Failure**: If API call fails, show user-friendly error message with retry button.
- **Empty Response**: If backend returns empty response, show "I couldn't process that. Try rephrasing?"
- **Long Response**: If response is very long, it should scroll within the chat panel, not overflow.
- **Rapid Messages**: If user sends messages rapidly, they should queue and process in order.
- **Token Expiration**: If JWT expires mid-conversation, prompt re-login gracefully without losing context.
- **Invalid Commands**: If user asks for something impossible ("Delete all projects"), explain what can't be done.
- **No Project Context**: If user says "Add task" on a page without project context, ask which project or show project selector.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Chat Widget

- **FR-001**: System MUST display a floating chat button fixed to the bottom-right corner of all dashboard pages.
- **FR-002**: System MUST expand a chat panel (380px width, 500px height) when the button is clicked.
- **FR-003**: System MUST display a header with "TaskFlow Assistant" title and close button.
- **FR-004**: System MUST show a scrollable messages area with user messages right-aligned (blue) and assistant messages left-aligned (gray).
- **FR-005**: System MUST provide a text input with placeholder "Ask me to manage your tasks..." and send button.
- **FR-006**: System MUST support Enter to send message and Shift+Enter for newline.
- **FR-007**: System MUST disable input and show loading indicator while waiting for response.

#### Authentication Integration

- **FR-010**: System MUST only display the chat widget when the user is authenticated.
- **FR-011**: System MUST show a login prompt overlay if unauthenticated user clicks chat button.
- **FR-012**: System MUST include authentication credentials (via httpOnly cookies) with all chat API requests.
- **FR-013**: System MUST handle 401 responses by showing re-login prompt, not technical error.

#### Context Awareness

- **FR-020**: System MUST extract current project ID from the URL path (e.g., `/projects/[id]`).
- **FR-021**: System MUST send project_id with chat requests when in project context.
- **FR-022**: System MUST display current project context in the chat panel header.
- **FR-023**: System MUST update context when user navigates to different project.

#### Conversation Management

- **FR-030**: System MUST maintain conversation_id across messages in the same session.
- **FR-031**: System MUST provide a "New conversation" button to start fresh thread.
- **FR-032**: System MUST persist conversation to backend for history retrieval.
- **FR-033**: System MUST load previous conversation messages when chat panel opens.

#### API Integration

- **FR-040**: System MUST send messages to POST /api/chat endpoint.
- **FR-041**: System MUST include in request body: message, conversation_id (optional), project_id (optional).
- **FR-042**: System MUST handle streaming responses from the backend.
- **FR-043**: System MUST display tool calls inline (collapsible) when enabled.

#### UI States

- **FR-050**: System MUST show loading state with typing indicator while waiting for response.
- **FR-051**: System MUST show error state with message and retry button on API failure.
- **FR-052**: System MUST show empty state with welcome message and suggested prompts for new conversations.
- **FR-053**: System MUST show auth error state with login button when session expires.

---

### Key Entities

- **ChatMessage**: Represents a single message in a conversation (role: user/assistant, content, timestamp, tool_calls optional)
- **Conversation**: A thread of messages with unique ID, associated user, created timestamp
- **ChatContext**: Current page context including project_id, page_path, timestamp
- **ToolCall**: Record of a tool invocation (tool_name, parameters, result)

---

## Constraints

- **ChatKit Script**: Must load OpenAI ChatKit external script; component cannot render until script is ready.
- **Same-Origin API**: Chat endpoint must be on same domain or properly configured for CORS.
- **Cookie Auth**: Uses httpOnly cookies (not Bearer tokens in headers) for authentication.
- **No Offline Mode**: Requires active network connection to chat backend.
- **Desktop-First**: Optimized for desktop; mobile responsive is stretch goal.

---

## Non-Goals

- Real-time push notifications (user must have chat open to see responses)
- Voice input/output
- File uploads via chat
- Multi-language support (English only for Phase III)
- Chat history export
- Sharing conversations with other users
- Custom chatbot personality configuration

---

## Assumptions

- **Backend Ready**: POST /api/chat endpoint exists or will be created as part of this feature.
- **OpenAI ChatKit**: Using @openai/chatkit-react library (already in robolearn-interface).
- **Streaming Support**: Backend supports streaming responses via SSE or similar.
- **Auth Working**: Better Auth with httpOnly cookies is functional in web-dashboard.
- **Project Context**: Project ID is available from URL routing in Next.js App Router.
- **Theme Match**: Chat panel will use existing IFK theme from web-dashboard.

---

## Dependencies

- **web-dashboard**: Next.js frontend where chat widget will be integrated
- **packages/api**: FastAPI backend that will provide POST /api/chat endpoint
- **@openai/chatkit-react**: ChatKit React library for chat UI components
- **Better Auth**: Authentication system (already integrated in web-dashboard)
- **OpenAI Agents SDK**: Backend uses this for processing chat messages (via MCP tools)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can send a message and receive a response within 5 seconds under normal load.
- **SC-002**: Chat button is visible and functional on all dashboard pages (/dashboard, /projects/*, /tasks/*).
- **SC-003**: 100% of chat requests include proper authentication (no anonymous requests succeed).
- **SC-004**: Project context is correctly passed in 100% of requests when user is on a project page.
- **SC-005**: Conversation history persists across browser sessions (test: close tab, reopen, see history).
- **SC-006**: Error messages are user-friendly (no raw JSON or stack traces shown to users).
- **SC-007**: Chat panel opens/closes in under 300ms (smooth animation).
- **SC-008**: Users can complete "add task via chat" flow in under 30 seconds.
- **SC-009**: Chat theme matches the rest of the dashboard (same colors, fonts, shadows).
- **SC-010**: Chat works correctly after page navigation (no stale state issues).

---

## Component Structure

The implementation should follow this structure (for planning reference):

```
web-dashboard/src/
├── components/
│   └── chat/
│       ├── ChatWidget.tsx       # Main widget wrapper
│       ├── ChatButton.tsx       # Floating trigger button
│       ├── ChatPanel.tsx        # Expanded chat panel
│       ├── ChatMessages.tsx     # Message list
│       ├── ChatInput.tsx        # Message input
│       ├── ToolCallDisplay.tsx  # Show tool invocations
│       └── LoginPrompt.tsx      # Auth required overlay
├── hooks/
│   └── useChat.ts               # Chat state and API calls
└── lib/
    └── chat-api.ts              # API client for /api/chat
```

---

## API Contract (Reference)

**POST /api/chat**

Request:
```json
{
  "message": "What tasks do I have?",
  "conversation_id": 123,
  "project_id": 5
}
```

Response:
```json
{
  "conversation_id": 123,
  "response": "You have 3 tasks in Project Alpha:\n- Buy groceries (pending)\n- Call mom (in progress)\n- Review PR #42 (completed)",
  "tool_calls": [
    {
      "tool": "list_tasks",
      "params": {"project_id": 5, "status": "all"},
      "result": {"tasks": [...]}
    }
  ]
}
```

---

## Technical Boundaries

This specification describes **WHAT** the system does, not **HOW** it is implemented. Technical decisions about:
- State management (React Context vs. Zustand vs. hooks)
- ChatKit configuration options
- Styling approach (CSS modules vs. Tailwind)
- Error boundary implementation

...are deferred to the planning phase (`/sp.plan`).
