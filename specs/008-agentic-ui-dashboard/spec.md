# Feature Specification: TaskFlow Agentic UI Dashboard

**Feature Branch**: `008-agentic-ui-dashboard`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "Agentic UI Dashboard - Interactive task management with ChatKit widgets, entity tagging, streaming UI, and server actions for TaskFlow. Build in web-dashboard/, integrate with packages/api/ ChatKit server agent config, and packages/mcp-server/ tools."

---

## Executive Summary

The TaskFlow Agentic UI Dashboard transforms the existing basic chat widget into a full **Agentic UI** experience where users manage tasks, projects, and workers through interactive widgets, @mentions, and streaming interfaces. This is the evolution of Phase III (MCP + ChatKit) from basic chat to rich, actionable interfaces.

**Core Value**: Instead of just text chat, users interact with **live task widgets** that update in real-time, @mention workers/agents, and trigger actions directly from chat responses—the same UI paradigm used by modern AI assistants like ChatGPT's artifacts.

**Key Differentiators**:
1. **Interactive Widgets** - Task lists with inline Complete/Assign/Start buttons
2. **Entity Tagging** - @mention workers and agents in natural language
3. **Streaming UI** - Progress indicators during task operations
4. **Composer Tools** - Mode switching for different task contexts
5. **Server Actions** - Widget clicks execute backend operations with instant UI updates

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Interact with Task List Widget (Priority: P1)

As a user chatting with TaskFlow Assistant, I want to see my tasks rendered as an interactive list widget (not just plain text) so I can complete, start, or view tasks directly from the chat without typing additional commands.

**Why this priority**: This is the core value proposition of Agentic UI—turning AI responses into actionable interfaces. Without interactive widgets, we just have a slightly better chatbot.

**Independent Test**: Can be fully tested by asking "Show my tasks", verifying a ListView widget renders with task items, clicking "Complete" on a task, and seeing the task status update instantly in the widget without page refresh.

**Acceptance Scenarios**:

1. **Given** I am authenticated and have tasks, **When** I ask "What are my tasks?" or "Show my tasks", **Then** the assistant renders a ListView widget showing task cards with title, status badge, priority indicator, and action buttons (Start/Complete/View).

2. **Given** I see a task list widget, **When** I click the "Complete" button on a pending task, **Then** the button shows a loading spinner, the task status badge updates to "completed", and I see a confirmation message—all without the widget disappearing.

3. **Given** I see a task list widget with an "in_progress" task, **When** I click "View Details", **Then** a detailed task card expands showing description, assignee, progress bar, and audit history snippet.

4. **Given** the backend fails to complete a task, **When** I click "Complete", **Then** the button returns to original state and an error toast appears with a user-friendly message.

---

### User Story 2 - @Mention Workers and Agents for Assignment (Priority: P1)

As a user, I want to type @worker-name in the chat composer and see autocomplete suggestions for both human workers and AI agents so I can assign tasks naturally through conversation.

**Why this priority**: Entity tagging is fundamental to TaskFlow's "agents as first-class citizens" principle. This enables natural language like "Assign this to @claude-code" instead of navigating through dropdown menus.

**Independent Test**: Can be fully tested by typing "@cl" in the composer, verifying autocomplete shows "@claude-code" with Bot icon, selecting it, sending "Assign task 5 to @claude-code", and verifying the assignment occurs with audit entry.

**Acceptance Scenarios**:

1. **Given** I am composing a message, **When** I type "@", **Then** an autocomplete popup appears showing project members (humans with User icon, agents with Bot icon).

2. **Given** I type "@cla", **When** the autocomplete filters, **Then** I see "@claude-code" with description "AI Agent - coding, architecture" and can select it with click or arrow+enter.

3. **Given** I send "Assign the auth task to @claude-code", **When** the assistant processes it, **Then** the assistant confirms assignment and the @claude-code mention is rendered as a clickable chip showing agent details on hover.

4. **Given** I click on a @worker mention in a message, **When** the popup appears, **Then** I see the worker's name, type (human/agent), capabilities, and current task count.

---

### User Story 3 - Real-time Progress During Operations (Priority: P2)

As a user, I want to see real-time progress indicators when the assistant is performing operations (listing tasks, creating tasks, etc.) so I know the system is working and approximately how long to wait.

**Why this priority**: Streaming UI improves perceived performance and user confidence. Without progress indication, users may think the system is frozen during multi-second operations.

**Independent Test**: Can be fully tested by asking to create 3 tasks, observing progress indicator "Creating tasks... 1/3, 2/3, 3/3", and seeing the final task list widget appear.

**Acceptance Scenarios**:

1. **Given** I ask "Create tasks: Design login, Implement API, Write tests", **When** the assistant starts processing, **Then** I see a progress indicator showing "Creating tasks..." with a spinner.

2. **Given** the assistant is fetching a large task list, **When** results stream in, **Then** I see "Loading tasks... 10 found" updating in real-time.

3. **Given** an operation takes more than 2 seconds, **When** progress updates occur, **Then** the assistant shows intermediate status like "Connecting to TaskFlow..." → "Fetching your tasks..." → "[Widget appears]".

4. **Given** UI interaction buttons exist, **When** the assistant is actively responding, **Then** the buttons are disabled/grayed to prevent race conditions, re-enabling when response completes.

---

### User Story 4 - Composer Tool Modes (Priority: P2)

As a user, I want quick-access mode buttons in the chat composer so I can switch between "Tasks", "Projects", and "Quick Actions" contexts without typing mode switches.

**Why this priority**: Composer tools reduce friction for common operations. Power users can work faster, and new users discover available capabilities.

**Independent Test**: Can be fully tested by clicking the "Tasks" mode button, seeing the placeholder change to "What tasks need attention?", sending a query, and verifying the response is task-focused.

**Acceptance Scenarios**:

1. **Given** the chat composer is visible, **When** I look above the input field, **Then** I see mode buttons: Tasks (checkbox icon), Projects (folder icon), Quick Actions (lightning icon).

2. **Given** I click "Tasks" mode, **When** the mode activates, **Then** the input placeholder changes to "What tasks need attention?", the button shows selected state, and subsequent messages are task-focused.

3. **Given** I'm in "Projects" mode, **When** I ask "What's the status?", **Then** the assistant responds with project-level overview rather than individual tasks.

4. **Given** I'm in "Quick Actions" mode, **When** I see suggested prompts, **Then** I see buttons like "My pending tasks", "Today's priorities", "Blocked items" that I can click to send.

---

### User Story 5 - Create Task via Widget Form (Priority: P2)

As a user, I want the assistant to show a task creation form widget so I can fill in task details (title, description, priority, assignee) visually instead of describing everything in natural language.

**Why this priority**: Form widgets enable precise input for structured data. Users can see all required/optional fields and make selections from dropdowns.

**Independent Test**: Can be fully tested by saying "I need to add a new task", seeing a form widget appear with fields, filling in details, clicking "Create", and verifying the task appears in the project.

**Acceptance Scenarios**:

1. **Given** I say "Add a task" or "Create new task", **When** the assistant responds, **Then** a form widget appears with: Title (required text), Description (optional textarea), Priority (dropdown: low/medium/high/urgent), Assignee (member selector with @mentions).

2. **Given** I fill out the task form and click "Create", **When** submission succeeds, **Then** the form widget is replaced with a success confirmation showing the created task's ID and a "View Task" button.

3. **Given** I leave the required Title field empty, **When** I click "Create", **Then** the Title field shows validation error "Title is required" without submitting.

4. **Given** I start filling the form but want to cancel, **When** I click "Cancel" or type a new message, **Then** the form is dismissed and I can continue chatting.

---

### User Story 6 - Project Context Awareness with Visual Indicator (Priority: P3)

As a user viewing a specific project, I want the chat to show a clear context indicator and have all queries scoped to that project automatically.

**Why this priority**: Context awareness was in the basic ChatKit spec (005) but needs visual enhancement for Agentic UI. Users should always know which project scope is active.

**Independent Test**: Can be fully tested by navigating to /projects/5, opening chat, seeing "Project: Alpha" badge in chat header, asking "Show tasks", and verifying only Project Alpha tasks appear.

**Acceptance Scenarios**:

1. **Given** I'm on `/projects/5` (Project Alpha), **When** I open the chat, **Then** I see a context badge "Project: Alpha" in the chat header with a small X to clear context.

2. **Given** project context is set, **When** I ask "Add task: Review PR", **Then** the task is created in Project Alpha without me specifying the project.

3. **Given** I click the X on the context badge, **When** context clears, **Then** I see "All Projects" as context and subsequent queries span all my projects.

4. **Given** I navigate from `/projects/5` to `/projects/7` while chat is open, **When** the URL changes, **Then** the context badge updates to show the new project.

---

### User Story 7 - Audit Trail Widget (Priority: P3)

As a user, I want to ask "Show audit log for task 5" and see a timeline widget showing who did what and when, with actor badges distinguishing humans from agents.

**Why this priority**: Audit visibility is a constitutional requirement. Widget format makes the audit trail scannable and actionable (e.g., click actor to see their profile).

**Independent Test**: Can be fully tested by asking "What happened to task 5?", seeing a timeline widget with entries like "12:30 @claude-code (bot) started task", and clicking an actor to see their profile popup.

**Acceptance Scenarios**:

1. **Given** I ask "Show history for task 5", **When** the assistant responds, **Then** a Timeline widget appears showing audit entries in reverse chronological order.

2. **Given** an audit entry shows "@claude-code completed task", **When** I view the entry, **Then** I see Bot icon next to @claude-code, timestamp, and action type badge (completed = green).

3. **Given** an audit entry has details (e.g., progress note), **When** I expand the entry, **Then** I see the full context including the note content.

---

### Edge Cases

- **Empty Task List**: When user has no tasks, show friendly empty state widget with "Create your first task" button instead of plain "No tasks found" text.
- **Network Failure During Widget Action**: If clicking "Complete" fails, show error toast, restore button state, and offer "Retry" option.
- **Stale Widget Data**: If task was modified elsewhere, widget should show "Refresh" indicator when data is potentially stale (e.g., after 30 seconds).
- **@Mention Unknown Worker**: If user types @nonexistent, show "Worker not found" in autocomplete with suggestion to check spelling.
- **Long Task Lists**: Paginate task list widgets at 10 items with "Show more" button to prevent overwhelming UI.
- **Concurrent Widget Actions**: If user clicks two action buttons rapidly, queue operations and show appropriate loading states.
- **Form Abandonment**: If user has unsaved form data and types a new message, show confirmation "Discard form?" before proceeding.
- **Widget Rendering During Streaming**: Widgets should render incrementally as data becomes available, not wait for full response.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Widget System

- **FR-001**: System MUST render task lists as interactive ListView widgets with per-item action buttons.
- **FR-002**: System MUST support widget action handlers that execute backend operations (server-side actions).
- **FR-003**: System MUST update widget UI immediately after action completion via ThreadItemReplacedEvent.
- **FR-004**: System MUST disable action buttons during response streaming to prevent race conditions.
- **FR-005**: System MUST support widget template rendering with dynamic data binding (Jinja-style variables).

#### Entity Tagging

- **FR-010**: System MUST provide @mention autocomplete triggered by typing "@" in composer.
- **FR-011**: System MUST display both human workers and AI agents in autocomplete with distinguishing icons.
- **FR-012**: System MUST filter autocomplete results to current project members only.
- **FR-013**: System MUST render @mentions as interactive chips in messages with hover preview.
- **FR-014**: System MUST support clicking @mention chips to view worker profile popup.

#### Streaming UI

- **FR-020**: System MUST show progress indicators during multi-step operations.
- **FR-021**: System MUST lock composer and disable widget buttons during active response.
- **FR-022**: System MUST unlock UI components when response completes (onResponseEnd).
- **FR-023**: System MUST display intermediate status messages for long-running operations.

#### Composer Tools

- **FR-030**: System MUST display tool mode buttons (Tasks, Projects, Quick Actions) in composer area.
- **FR-031**: System MUST change composer placeholder text based on selected mode.
- **FR-032**: System MUST pass selected tool_choice to backend with each request.
- **FR-033**: System MUST support persistent mode selection (stays selected after sending message).

#### Task Form Widget

- **FR-040**: System MUST render task creation form as interactive widget when requested.
- **FR-041**: System MUST validate required fields (title) before submission.
- **FR-042**: System MUST populate assignee dropdown with project members (@mention format).
- **FR-043**: System MUST replace form widget with success confirmation after task creation.

#### Context Awareness

- **FR-050**: System MUST display current project context in chat header when on project page.
- **FR-051**: System MUST allow clearing project context via X button.
- **FR-052**: System MUST update context automatically when user navigates between projects.
- **FR-053**: System MUST scope all queries to current project context when set.

#### Audit Widget

- **FR-060**: System MUST render audit logs as Timeline widget with chronological entries.
- **FR-061**: System MUST display actor type (human/agent) with appropriate icon per entry.
- **FR-062**: System MUST support expandable entries for entries with additional details.

### Key Entities

- **Widget**: Visual component rendered in chat with interactive elements (ListView, Form, Timeline, Button, Text, Box, Image)
- **WidgetAction**: User interaction on widget (click, select) with type, payload, and handler (client/server)
- **EntityTag**: @mention reference to a Worker (human or agent) with id, handle, type
- **ComposerTool**: Mode selector with id, label, icon, placeholder override
- **ProgressEvent**: Real-time status update during operation execution

---

## Constraints

- **Widget Complexity**: Widget templates limited to ChatKit's supported components (ListView, Box, Row, Col, Text, Button, Image, Icon).
- **Streaming Protocol**: Must use ChatKit's SSE-based streaming; cannot implement custom WebSocket.
- **No Custom Styling**: Widget styles constrained to ChatKit's theme system (colorScheme, color, typography, radius).
- **Action Handler Latency**: Server actions must complete within 10 seconds or show timeout message.
- **Desktop-First**: Optimized for desktop viewport (1024px+); mobile is out of scope.

---

## Non-Goals

- **Drag-and-Drop**: Task reordering via drag is not supported in this phase.
- **Offline Mode**: Widgets require active connection; no offline caching.
- **Custom Widget Types**: Only using ChatKit's built-in component library.
- **Voice Input**: Speech-to-text for chat input is out of scope.
- **Multi-Select Actions**: Bulk operations on multiple tasks simultaneously.
- **Widget Export**: Cannot export widgets to other formats (PDF, image).

---

## Assumptions

- **ChatKit Widgets Available**: @openai/chatkit-react supports ListView, Button, Form components as per documentation.
- **Backend ChatKit Server Exists**: packages/api/src/taskflow_api/services/chatkit_server.py is functional.
- **MCP Tools Exist**: packages/mcp-server has 9 task management tools ready for use.
- **Auth Working**: Better Auth with httpOnly cookies is functional in web-dashboard.
- **Entity Tagging API**: Backend can provide /api/members endpoint for autocomplete data.
- **Widget Template Support**: ChatKit server can return widget JSON in response items.

---

## Dependencies

- **web-dashboard**: Next.js frontend where Agentic UI will be integrated
- **packages/api**: FastAPI backend with ChatKit server and /chatkit endpoint
- **packages/mcp-server**: MCP tools for task operations (taskflow_add_task, etc.)
- **@openai/chatkit-react**: ChatKit React library (already installed)
- **Existing ChatKitWidget.tsx**: Base component to extend (web-dashboard/src/components/chat/)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a task from chat widget in under 3 seconds (click to confirmation).
- **SC-002**: @mention autocomplete appears within 200ms of typing "@".
- **SC-003**: Widget actions show loading state within 100ms of click.
- **SC-004**: 100% of widget button clicks create corresponding audit entries.
- **SC-005**: Task list widget renders correctly with up to 50 tasks (pagination active).
- **SC-006**: Progress indicators display for any operation exceeding 500ms.
- **SC-007**: Users can create a task via form widget in under 30 seconds.
- **SC-008**: Context badge updates within 500ms of navigation between projects.
- **SC-009**: Entity tagging works for all project members (human and agent parity).
- **SC-010**: Error states show user-friendly messages (no raw JSON or stack traces).

---

## Technical Boundaries

This specification describes **WHAT** the system does, not **HOW** it is implemented. Technical decisions about:
- State management (React state vs. Zustand)
- Widget template format (Jinja vs. JSON schema)
- Component architecture and file structure
- Styling approach (CSS modules vs. Tailwind in widgets)
- Error boundary implementation

...are deferred to the planning phase (`/sp.plan`).

---

## Integration Points

### Frontend (web-dashboard)
- Extend `ChatKitWidget.tsx` with widget action handlers
- Add entity tagging via `useChatKit` configuration
- Implement composer tool modes
- Add progress indicator components

### Backend (packages/api)
- Extend `chatkit_server.py` with widget template rendering
- Add `action()` method for server-side widget actions
- Implement `/api/members` endpoint for @mention autocomplete
- Add widget action audit logging

### MCP Server (packages/mcp-server)
- No changes to MCP tools themselves
- MCP tools continue to return JSON; ChatKit server wraps in widgets
- Streaming handled by ChatKit's `stream_agent_response()`
