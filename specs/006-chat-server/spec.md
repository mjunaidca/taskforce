# Feature Specification: TaskFlow Chat Server

**Feature Branch**: `006-chat-server`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "Build ChatKit server in existing FastAPI packages/api with OpenAI Agents SDK, MCP integration, conversation persistence, and JWT auth"

## Overview

The TaskFlow Chat Server enables natural language task management through a conversational interface. Users interact with an AI assistant that can create, list, update, delete, and complete tasks using natural language commands. The chat server integrates with the existing TaskFlow API and connects to the TaskFlow MCP Server for tool execution.

### Context

- **Phase**: III (MCP + Chat) of TaskFlow Hackathon
- **Integration Point**: Extends existing `packages/api` FastAPI application
- **Reference Implementation**: `rag-agent/` provides working ChatKit patterns to reuse
- **MCP Server**: TaskFlow MCP Server (separate service, HTTP transport on port 8001)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Natural Language Task Creation (Priority: P1)

A user opens the chat interface and says "Add a task to buy groceries". The AI assistant creates the task in their current project and confirms the action.

**Why this priority**: Core value proposition - users can manage tasks without navigating forms or learning CLI commands.

**Independent Test**: Can be fully tested by sending a chat message and verifying task appears in task list.

**Acceptance Scenarios**:

1. **Given** a user is authenticated and has a project, **When** they send "Add a task to buy groceries", **Then** a new task titled "Buy groceries" is created in their project and the assistant confirms with task details.

2. **Given** a user sends a task creation request, **When** they provide additional context like "Add task to review PR by tomorrow, high priority", **Then** the task is created with the specified priority and due date.

3. **Given** a user has no project context set, **When** they try to add a task, **Then** the assistant prompts them to specify or select a project.

---

### User Story 2 - Task Listing and Status Queries (Priority: P1)

A user asks "What's on my plate?" or "Show me pending tasks" and receives a formatted list of their tasks with status, priority, and assignment information.

**Why this priority**: Users need visibility into their work alongside the ability to create tasks.

**Independent Test**: Can be tested by querying tasks and verifying response matches database state.

**Acceptance Scenarios**:

1. **Given** a user has tasks in their project, **When** they ask "Show me all my tasks", **Then** they receive a list of all tasks with title, status, and assignee.

2. **Given** a user asks "What's pending?", **When** the query is processed, **Then** only tasks with status "pending" are returned.

3. **Given** a user asks "What have I completed?", **When** the query is processed, **Then** only tasks with status "completed" are returned.

---

### User Story 3 - Task Completion and Updates (Priority: P2)

A user says "Mark task 3 as complete" or "Change task 1 to 'Call mom tonight'" and the assistant updates the task accordingly.

**Why this priority**: Task lifecycle management is essential but depends on having tasks created first.

**Independent Test**: Can be tested by modifying existing tasks and verifying database updates.

**Acceptance Scenarios**:

1. **Given** a task exists with ID 3, **When** user says "Mark task 3 as complete", **Then** the task status changes to "completed" and assistant confirms.

2. **Given** a task exists with ID 1, **When** user says "Change task 1 to 'Call mom tonight'", **Then** the task title is updated and assistant confirms the change.

3. **Given** a user references a non-existent task, **When** they try to update it, **Then** the assistant explains the task was not found and suggests listing tasks.

---

### User Story 4 - Task Deletion (Priority: P2)

A user says "Delete the meeting task" and the assistant identifies and removes the task after confirmation.

**Why this priority**: Cleanup operations are important but less frequent than creation and updates.

**Independent Test**: Can be tested by deleting a task and verifying removal.

**Acceptance Scenarios**:

1. **Given** a task titled "meeting" exists, **When** user says "Delete the meeting task", **Then** the assistant identifies the task, confirms deletion, and removes it.

2. **Given** multiple tasks match "meeting", **When** user requests deletion, **Then** the assistant lists matching tasks and asks for clarification.

---

### User Story 5 - Conversation Continuity (Priority: P3)

A user returns to the chat after closing their browser and continues their previous conversation with context preserved.

**Why this priority**: Session persistence improves UX but core functionality works without it.

**Independent Test**: Can be tested by creating conversation, closing session, and resuming.

**Acceptance Scenarios**:

1. **Given** a user has previous chat history, **When** they open a new session with the same conversation_id, **Then** previous messages are loaded and context is preserved.

2. **Given** a user starts fresh, **When** they don't provide a conversation_id, **Then** a new conversation is created.

---

### Edge Cases

- What happens when the MCP server is unavailable? → Return friendly error message suggesting retry.
- How does the system handle ambiguous task references like "the task"? → List matching tasks and ask for clarification.
- What happens when a user exceeds conversation history limit? → Oldest messages are truncated, most recent 20 retained.
- What happens when the user is not authenticated? → Return 401 Unauthorized.
- What happens when OpenAI API fails? → Log error and return generic error message to user.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a POST /api/chat endpoint that accepts user messages and returns AI responses.
- **FR-002**: System MUST authenticate users via existing JWT/JWKS mechanism (same as other API endpoints).
- **FR-003**: System MUST persist conversations and messages to the database.
- **FR-004**: System MUST connect to TaskFlow MCP Server via HTTP transport to execute task operations.
- **FR-005**: System MUST include conversation history (last 20 messages) when generating AI responses.
- **FR-006**: System MUST support creating new conversations when no conversation_id is provided.
- **FR-007**: System MUST return tool_calls in the response showing which MCP tools were invoked.
- **FR-008**: System MUST inject user context (name, current project) into the AI agent's system prompt.
- **FR-009**: System MUST use a separate database connection (CHATKIT_STORE_DATABASE_URL) for ChatKit persistence.
- **FR-010**: System MUST create audit log entries for all task operations performed through chat.

### Key Entities

- **Conversation**: Represents a chat session. Contains user_id, optional project_id for context, and timestamps. One user can have multiple conversations.

- **Message**: A single message within a conversation. Contains role (user/assistant), content text, optional tool_calls (JSON array of invoked tools), and timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a task through natural language chat in under 5 seconds.
- **SC-002**: System correctly interprets and executes 90% of task management requests on first attempt.
- **SC-003**: Conversation history persists across browser sessions with no data loss.
- **SC-004**: Chat responses include confirmation of actions taken with specific task details.
- **SC-005**: All chat-initiated task operations appear in the audit trail with actor identified.
- **SC-006**: System handles MCP server unavailability gracefully with user-friendly error messages.

## Assumptions

1. **MCP Server Availability**: The TaskFlow MCP Server will be running on a configurable URL (default: http://localhost:8001).
2. **Database Configuration**: CHATKIT_STORE_DATABASE_URL environment variable will be set for ChatKit's separate database connection.
3. **OpenAI API Key**: OPENAI_API_KEY environment variable will be available for Agents SDK.
4. **User Context**: Users will have at least one project to work with; project_id can be passed in chat requests.
5. **ChatKit Infrastructure**: Reuse existing chatkit_store patterns from rag-agent for PostgreSQL persistence.

## Non-Goals

- Voice input/output (text-only interface)
- Multi-language support beyond English
- Real-time streaming of partial responses (initial implementation returns complete responses)
- Direct database access from chat (all operations go through MCP tools)
- Agent-to-agent chat delegation

## Dependencies

- OpenAI Agents SDK (`openai-agents`)
- ChatKit server library (`chatkit`)
- Existing TaskFlow API authentication (JWT/JWKS)
- TaskFlow MCP Server (HTTP transport)
- PostgreSQL database for conversation storage

## Agent Behavior Reference

| User Says | Agent Action |
|-----------|--------------|
| "Add a task to buy groceries" | Call taskflow_add_task |
| "Show me all my tasks" | Call taskflow_list_tasks with status "all" |
| "What's pending?" | Call taskflow_list_tasks with status "pending" |
| "Mark task 3 as complete" | Call taskflow_complete_task |
| "Delete the meeting task" | Call taskflow_list_tasks first, then taskflow_delete_task |
| "Change task 1 to 'Call mom tonight'" | Call taskflow_update_task |
