"""ChatKit server integration for TaskFlow with MCP.

This module provides the ChatKit server implementation that integrates
with the TaskFlow MCP Server for task management operations.

Key integration pattern:
- Agent uses MCP tools directly (taskflow_list_tasks, etc.)
- RunHooks intercept tool results and stream widgets automatically
- No separate widget tools needed - widgets are post-processed from MCP results

Based on patterns from ChatKit blueprints and OpenAI Agents SDK RunHooks.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from datetime import datetime
from typing import Annotated, Any

import httpx
from agents import Agent, RunContextWrapper, RunHooks, Runner, Tool, function_tool
from agents.mcp import MCPServerStreamableHttp
from chatkit.actions import Action
from chatkit.agents import AgentContext, stream_agent_response
from chatkit.server import ChatKitServer
from chatkit.types import (
    AssistantMessageContent,
    AssistantMessageItem,
    ThreadItemDoneEvent,
    ThreadMetadata,
    ThreadStreamEvent,
    UserMessageItem,
    UserMessageTextContent,
    WidgetItem,
)
from pydantic import ConfigDict, Field

from ..chatkit_store import PostgresStore, RequestContext
from .chat_agent import TASKFLOW_SYSTEM_PROMPT
from .widgets import (
    build_audit_timeline_widget,
    build_projects_widget,
    build_task_created_confirmation,
    build_task_form_widget,
    build_task_list_widget,
)

logger = logging.getLogger(__name__)


def _parse_mcp_result(result: Any) -> Any:
    """Parse MCP tool result (CallToolResult) from JSON-RPC response.

    MCP call_tool() returns a CallToolResult with:
    - content: list of content items (TextContent with .text attribute)
    - structuredContent: optional dict

    Args:
        result: CallToolResult from mcp_server.call_tool()

    Returns:
        Parsed JSON data or empty list if parsing fails
    """
    logger.debug("[MCP] _parse_mcp_result called with type=%s", type(result).__name__)

    if not result:
        logger.warning("[MCP] Result is None/empty")
        return []

    # Log what we received
    logger.debug(
        "[MCP] Result attributes: %s", dir(result) if hasattr(result, "__dir__") else "N/A"
    )

    # Try structuredContent first (if available)
    if hasattr(result, "structuredContent") and result.structuredContent:
        logger.info("[MCP] Using structuredContent: %s", type(result.structuredContent).__name__)
        return result.structuredContent

    # Fall back to content list
    if hasattr(result, "content") and result.content:
        content_list = result.content
        logger.info("[MCP] Using content list, length=%d", len(content_list))
        if len(content_list) > 0:
            first_item = content_list[0]
            logger.debug("[MCP] First content item type=%s", type(first_item).__name__)
            if hasattr(first_item, "text"):
                logger.debug(
                    "[MCP] Content text (first 200 chars): %s",
                    first_item.text[:200] if first_item.text else "empty",
                )
                try:
                    parsed = json.loads(first_item.text)
                    logger.info(
                        "[MCP] Parsed JSON successfully, type=%s, len=%s",
                        type(parsed).__name__,
                        len(parsed) if isinstance(parsed, (list, dict)) else "N/A",
                    )
                    return parsed
                except (json.JSONDecodeError, TypeError) as e:
                    logger.error(
                        "[MCP] JSON parse failed: %s, text=%s",
                        e,
                        first_item.text[:100] if first_item.text else "empty",
                    )

    # Legacy: handle if result is already a list (backwards compat)
    if isinstance(result, list) and len(result) > 0:
        logger.info("[MCP] Using legacy list format, length=%d", len(result))
        first_item = result[0]
        if hasattr(first_item, "text"):
            try:
                parsed = json.loads(first_item.text)
                logger.info("[MCP] Legacy parse successful")
                return parsed
            except (json.JSONDecodeError, TypeError) as e:
                logger.error("[MCP] Legacy JSON parse failed: %s", e)

    logger.warning("[MCP] Could not parse result, returning empty list")
    return []


def _user_message_text(item: UserMessageItem | None) -> str:
    """Extract text from user message item."""
    if not item:
        return ""
    parts: list[str] = []
    for part in item.content:
        if isinstance(part, UserMessageTextContent):
            parts.append(part.text)
    return " ".join(parts).strip()


class TaskFlowAgentContext(AgentContext):
    """Agent context for TaskFlow with MCP server access for widget tools.

    This context provides:
    - MCP server for calling TaskFlow tools
    - Request context with user auth and project info
    - Widget streaming capability via stream_widget()
    """

    # Allow arbitrary types like MCPServerStreamableHttp
    model_config = ConfigDict(arbitrary_types_allowed=True)

    # MCP server for widget tools to call TaskFlow tools
    # Field(exclude=True) prevents serialization issues
    mcp_server: Annotated[MCPServerStreamableHttp | None, Field(exclude=True)] = None

    # User authentication and cached info for easy access in tools
    user_id: str = ""
    project_id: int | None = None
    project_name: str | None = None
    access_token: str = ""
    mcp_server_url: str = ""


# =============================================================================
# Local Function Tools - Wrap MCP calls via HTTP for hook support
# These tools call MCP server directly and enable on_tool_end hooks
# =============================================================================


async def _call_mcp_tool(
    mcp_url: str,
    tool_name: str,
    arguments: dict[str, Any],
    access_token: str = "",
) -> Any:
    """Call an MCP tool via HTTP JSON-RPC using streaming transport.

    Args:
        mcp_url: Full MCP server URL including /mcp path (e.g., http://mcp-server:8001/mcp)
        tool_name: Name of the MCP tool to call
        arguments: Tool arguments as dict
        access_token: Optional auth token to pass to MCP

    Returns:
        Parsed JSON result from MCP tool
    """
    # MCP uses JSON-RPC 2.0 over HTTP with streaming response
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments,
        },
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",  # MCP Streamable HTTP
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # MCP Streamable HTTP returns newline-delimited JSON stream
            async with client.stream("POST", mcp_url, json=payload, headers=headers) as response:
                response.raise_for_status()

                # Iterate through the response stream line by line
                async for line in response.aiter_lines():
                    if line:  # Skip empty lines
                        # Lines may have "data: " prefix - strip it
                        if line.startswith("data: "):
                            line = line[6:]

                        logger.info("[MCP] Received line: %s", line[:500])

                        # Parse the JSON-RPC response
                        result = json.loads(line)

                        # Check for JSON-RPC error
                        if "error" in result:
                            error_msg = result["error"].get("message", str(result["error"]))
                            raise Exception(f"MCP error: {error_msg}")

                        # Extract the result payload
                        mcp_result = result.get("result")
                        if mcp_result is None:
                            continue  # Skip and wait for next line

                        # Handle two formats:
                        # 1. Streaming: {"result": {"content": [{"type": "text", "text": "..."}]}}
                        # 2. JSON (json_response=True): {"result": [...]} or {"result": {...}}

                        # Try streaming format first (with content array)
                        if isinstance(mcp_result, dict) and "content" in mcp_result:
                            content = mcp_result.get("content", [])
                            if content and len(content) > 0:
                                first = content[0]
                                if first.get("type") == "text":
                                    text = first.get("text", "")
                                    if text:
                                        logger.info("[MCP] Content text: %s", text[:500])
                                        # Check if text starts with "Error" - it's an error message
                                        if text.startswith("Error"):
                                            raise Exception(f"MCP tool error: {text}")
                                        try:
                                            return json.loads(text)
                                        except json.JSONDecodeError:
                                            # Return text as-is if not JSON
                                            return text

                        # Direct JSON format - return as-is (could be list or dict)
                        logger.info("[MCP] Direct JSON result: %s", str(mcp_result)[:200])
                        return mcp_result

                # If we get here, no valid response was received
                raise Exception("No valid response received from MCP server")

    except httpx.HTTPStatusError as e:
        logger.error("[MCP] HTTP error: %s", e)
        raise Exception(f"MCP HTTP error: {e.response.status_code} - {e.response.text}")
    except Exception:
        logger.exception("[MCP] Call failed")
        raise


@function_tool
async def list_tasks(
    ctx: RunContextWrapper[TaskFlowAgentContext],
    project_id: int | None = None,
    status: str | None = None,
    assigned_to: str | None = None,
) -> str:
    """List tasks from TaskFlow. Returns tasks as JSON.

    Args:
        project_id: Optional project ID to filter by
        status: Optional status filter (pending, in_progress, completed)
        assigned_to: Optional assignee filter
    """
    agent_ctx = ctx.context
    mcp_url = agent_ctx.mcp_server_url

    # Build MCP tool arguments - FastMCP expects arguments wrapped in "params" key
    # because the tool function parameter is named "params"
    tool_params: dict[str, Any] = {
        "user_id": agent_ctx.user_id,
        "access_token": agent_ctx.access_token,
        "project_id": project_id if project_id is not None else agent_ctx.project_id,
    }
    if status:
        tool_params["status"] = status
    # Note: assigned_to is not part of ListTasksInput schema

    arguments = {"params": tool_params}

    logger.info("[LOCAL TOOL] list_tasks called with params=%s", tool_params)

    try:
        result = await _call_mcp_tool(
            mcp_url,
            "taskflow_list_tasks",
            arguments,
            agent_ctx.access_token,
        )
        logger.info(
            "[LOCAL TOOL] list_tasks returned %d tasks",
            len(result) if isinstance(result, list) else 0,
        )
        return json.dumps(result)
    except Exception as e:
        logger.exception("[LOCAL TOOL] list_tasks failed: %s", e)
        return json.dumps({"error": str(e)})


@function_tool
async def add_task(
    ctx: RunContextWrapper[TaskFlowAgentContext],
    title: str,
    project_id: int | None = None,
    description: str | None = None,
    priority: str = "medium",
    assigned_to: str | None = None,
) -> str:
    """Create a new task in TaskFlow.

    Args:
        title: Task title (required)
        project_id: Project ID to add task to
        description: Optional task description
        priority: Priority level (low, medium, high, urgent)
        assigned_to: Optional assignee
    """
    agent_ctx = ctx.context
    mcp_url = agent_ctx.mcp_server_url

    # Build MCP tool arguments - FastMCP expects arguments wrapped in "params" key
    tool_params: dict[str, Any] = {
        "user_id": agent_ctx.user_id,
        "access_token": agent_ctx.access_token,
        "project_id": project_id if project_id is not None else agent_ctx.project_id,
        "title": title,
    }
    if description:
        tool_params["description"] = description
    # Note: priority and assigned_to are not part of AddTaskInput schema

    arguments = {"params": tool_params}

    logger.info("[LOCAL TOOL] add_task called with title=%s", title)

    try:
        result = await _call_mcp_tool(
            mcp_url,
            "taskflow_add_task",
            arguments,
            agent_ctx.access_token,
        )
        logger.info(
            "[LOCAL TOOL] add_task created task_id=%s",
            result.get("task_id") if isinstance(result, dict) else "?",
        )
        return json.dumps(result)
    except Exception as e:
        logger.exception("[LOCAL TOOL] add_task failed: %s", e)
        return json.dumps({"error": str(e)})


@function_tool
async def show_task_form(
    ctx: RunContextWrapper[TaskFlowAgentContext],
) -> str:
    """Show interactive task creation form widget.

    Triggers the form widget UI for creating a new task with all fields.
    Use this when the user wants to create a task but hasn't provided all details.
    """
    agent_ctx = ctx.context
    mcp_url = agent_ctx.mcp_server_url

    # Build MCP tool arguments - task_id is ignored, just need user context
    tool_params: dict[str, Any] = {
        "user_id": agent_ctx.user_id,
        "access_token": agent_ctx.access_token,
        "task_id": 0,  # Ignored by the tool, but required by TaskIdInput schema
    }

    arguments = {"params": tool_params}

    logger.info("[LOCAL TOOL] show_task_form called")

    try:
        result = await _call_mcp_tool(
            mcp_url,
            "taskflow_show_task_form",
            arguments,
            agent_ctx.access_token,
        )
        logger.info("[LOCAL TOOL] show_task_form returned: %s", result)
        return json.dumps(result)
    except Exception as e:
        logger.exception("[LOCAL TOOL] show_task_form failed: %s", e)
        return json.dumps({"error": str(e)})


@function_tool
async def list_projects(
    ctx: RunContextWrapper[TaskFlowAgentContext],
) -> str:
    """List all projects the user has access to."""
    agent_ctx = ctx.context
    mcp_url = agent_ctx.mcp_server_url

    # Build MCP tool arguments - FastMCP expects arguments wrapped in "params" key
    tool_params: dict[str, Any] = {
        "user_id": agent_ctx.user_id,
        "access_token": agent_ctx.access_token,
    }

    arguments = {"params": tool_params}

    logger.info("[LOCAL TOOL] list_projects called with user_id=%s", agent_ctx.user_id)

    try:
        result = await _call_mcp_tool(
            mcp_url,
            "taskflow_list_projects",
            arguments,
            agent_ctx.access_token,
        )
        logger.info(
            "[LOCAL TOOL] list_projects returned %d projects",
            len(result) if isinstance(result, list) else 0,
        )
        return json.dumps(result)
    except Exception as e:
        logger.exception("[LOCAL TOOL] list_projects failed: %s", e)
        return json.dumps({"error": str(e)})


# =============================================================================
# Widget-streaming RunHooks
# Intercepts local tool results and streams widgets automatically
# =============================================================================


class WidgetStreamingHooks(RunHooks[TaskFlowAgentContext]):
    """RunHooks that stream widgets based on local tool results.

    This hooks into the agent's tool execution flow and:
    1. Detects when local tools (list_tasks, add_task, etc.) are called
    2. Parses the tool result JSON
    3. Streams the appropriate widget to the UI

    Local tools call MCP via HTTP, so hooks fire properly.
    """

    # Map local tool names to widget streaming handlers
    WIDGET_TOOLS = {
        "list_tasks": "_stream_task_list_widget",
        "add_task": "_stream_task_created_widget",
        "show_task_form": "_stream_task_form_widget",
        "list_projects": "_stream_projects_widget",
    }

    async def on_agent_start(
        self,
        context: RunContextWrapper[TaskFlowAgentContext],
        agent: Agent[TaskFlowAgentContext],
    ) -> None:
        """Called when agent starts - for debugging."""
        logger.info("[HOOKS] on_agent_start for agent=%s", agent.name)

    async def on_tool_start(
        self,
        context: RunContextWrapper[TaskFlowAgentContext],
        agent: Agent[TaskFlowAgentContext],
        tool: Tool,
    ) -> None:
        """Called before a tool executes - for debugging."""
        logger.info("[HOOKS] on_tool_start for tool=%s (type=%s)", tool.name, type(tool).__name__)

    async def on_tool_end(
        self,
        context: RunContextWrapper[TaskFlowAgentContext],
        agent: Agent[TaskFlowAgentContext],
        tool: Tool,
        result: str,
    ) -> None:
        """Called after a local tool completes. Stream widget if applicable.

        Local tools return clean JSON (no MCP envelope wrapper).
        """
        tool_name = tool.name
        logger.info(
            "[HOOKS] on_tool_end for tool=%s, result_len=%d",
            tool_name,
            len(result) if result else 0,
        )

        # Check if this tool should trigger a widget
        handler_name = self.WIDGET_TOOLS.get(tool_name)
        if not handler_name:
            logger.debug("[HOOKS] No widget handler for tool=%s", tool_name)
            return

        # Parse the tool result - local tools return clean JSON
        try:
            data = json.loads(result)
            logger.info(
                "[HOOKS] Parsed tool result for %s: type=%s, len=%s",
                tool_name,
                type(data).__name__,
                len(data) if isinstance(data, (list, dict)) else "N/A",
            )

            # Check for error response
            if isinstance(data, dict) and "error" in data:
                logger.warning("[HOOKS] Tool returned error: %s", data["error"])
                return

        except (json.JSONDecodeError, TypeError) as e:
            logger.warning("[HOOKS] Failed to parse tool result: %s", e)
            return

        # Call the appropriate handler
        handler = getattr(self, handler_name, None)
        if handler:
            try:
                await handler(context, data)
            except Exception as e:
                logger.exception("[HOOKS] Widget streaming failed for %s: %s", tool_name, e)

    async def _stream_task_list_widget(
        self,
        context: RunContextWrapper[TaskFlowAgentContext],
        data: Any,
    ) -> None:
        """Stream task list widget after taskflow_list_tasks."""
        # Extract tasks from result
        tasks = (
            data
            if isinstance(data, list)
            else data.get("tasks", [])
            if isinstance(data, dict)
            else []
        )
        task_count = len(tasks)

        logger.info("[HOOKS] Streaming task list widget with %d tasks", task_count)

        # Get project info from context
        project_id = context.context.project_id
        project_name = context.context.project_name
        project_label = project_name or f"Project #{project_id}" if project_id else "all projects"

        # Build and stream the widget
        widget = build_task_list_widget(tasks, project_id=project_id)

        # Log the widget for debugging
        logger.info("[HOOKS] Widget structure: %s", json.dumps(widget)[:1000])

        await context.context.stream_widget(
            widget, copy_text=f"{task_count} tasks in {project_label}"
        )

        logger.info("[HOOKS] Task list widget streamed successfully")

    async def _stream_task_created_widget(
        self,
        context: RunContextWrapper[TaskFlowAgentContext],
        data: Any,
    ) -> None:
        """Stream task created confirmation after taskflow_add_task."""
        if not isinstance(data, dict):
            logger.warning("[HOOKS] Unexpected data type for task creation: %s", type(data))
            return

        task_id = data.get("task_id") or data.get("id")
        title = data.get("title", "New task")
        project_name = context.context.project_name

        logger.info("[HOOKS] Streaming task created widget for task_id=%s", task_id)

        # Build and stream confirmation widget
        widget = build_task_created_confirmation(
            task_id=task_id or 0,
            title=title,
            project_name=project_name,
        )
        await context.context.stream_widget(widget)

        logger.info("[HOOKS] Task created widget streamed successfully")

    async def _stream_task_form_widget(
        self,
        context: RunContextWrapper[TaskFlowAgentContext],
        data: Any,
    ) -> None:
        """Stream task creation form widget after taskflow_show_task_form."""
        logger.info("[HOOKS] Streaming task form widget")

        # Get project info from context
        project_id = context.context.project_id

        # Fetch members for assignee dropdown via MCP
        members = []
        try:
            mcp_server = context.context.mcp_server
            access_token = context.context.access_token
            user_id = context.context.user_id

            members_result = await mcp_server.call_tool(
                "taskflow_list_workers",
                {
                    "user_id": user_id,
                    "access_token": access_token,
                },
            )
            members_data = _parse_mcp_result(members_result)
            members = (
                members_data
                if isinstance(members_data, list)
                else members_data.get("workers", [])
                if isinstance(members_data, dict)
                else []
            )
        except Exception as e:
            logger.warning("[HOOKS] Could not fetch members for form: %s", e)

        # Build and stream the form widget
        widget = build_task_form_widget(
            project_id=project_id,
            members=members,
        )

        await context.context.stream_widget(widget, copy_text="Create new task")

        logger.info("[HOOKS] Task form widget streamed successfully")

    async def _stream_audit_widget(
        self,
        context: RunContextWrapper[TaskFlowAgentContext],
        data: Any,
    ) -> None:
        """Stream audit timeline widget after taskflow_get_audit_log."""
        # Extract audit entries
        audit_entries = []
        entity_title = None
        entity_type = "task"
        entity_id = 0

        if isinstance(data, dict):
            audit_entries = data.get("entries", [])
            entity_title = data.get("entity_title")
            entity_type = data.get("entity_type", "task")
            entity_id = data.get("entity_id", 0)
        elif isinstance(data, list):
            audit_entries = data

        entry_count = len(audit_entries)
        logger.info("[HOOKS] Streaming audit widget with %d entries", entry_count)

        # Build and stream the widget
        widget = build_audit_timeline_widget(
            audit_entries=audit_entries,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_title=entity_title,
        )
        await context.context.stream_widget(widget, copy_text=f"{entry_count} audit entries")

        logger.info("[HOOKS] Audit widget streamed successfully")

    async def _stream_projects_widget(
        self,
        context: RunContextWrapper[TaskFlowAgentContext],
        data: Any,
    ) -> None:
        """Stream projects list widget after list_projects."""
        projects = data if isinstance(data, list) else []
        project_count = len(projects)

        logger.info("[HOOKS] Streaming projects widget with %d projects", project_count)

        # Build and stream the widget
        widget = build_projects_widget(projects)

        # Log the widget for debugging
        logger.info("[HOOKS] Widget structure: %s", json.dumps(widget)[:1000])

        await context.context.stream_widget(widget, copy_text=f"{project_count} projects")
        logger.info("[HOOKS] Projects widget streamed successfully")


class TaskFlowChatKitServer(ChatKitServer[RequestContext]):
    """
    ChatKit server for TaskFlow task management with MCP integration.

    Integrates with the TaskFlow MCP Server to provide natural language
    task management capabilities. Tools are discovered dynamically via MCP.
    """

    def __init__(self, store: PostgresStore, mcp_server_url: str):
        """Initialize the ChatKit server with PostgreSQL store.

        Args:
            store: PostgreSQL store for conversation persistence
            mcp_server_url: URL of TaskFlow MCP Server (e.g., http://localhost:8001/mcp)
        """
        super().__init__(store, attachment_store=None)
        self.mcp_server_url = mcp_server_url
        logger.info("TaskFlowChatKitServer initialized with MCP server: %s", mcp_server_url)

    async def action(
        self,
        thread: ThreadMetadata,
        action: Action[str, Any],
        sender: WidgetItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        """
        Handle widget action by converting it to a natural language message.

        This bridges widget button clicks to the agent via natural language,
        allowing actions to work without explicit backend handlers.

        Args:
            thread: Thread metadata
            action: The action triggered (type and payload)
            sender: The widget that sent the action
            context: Context dict from ChatKit

        Yields:
            ThreadStreamEvent: Stream of events processing the action
        """
        logger.info("[ACTION] Received action: type=%s, payload=%s", action.type, action.payload)

        # Convert action to natural language message
        message_text = self._action_to_message(action.type, action.payload)

        if not message_text:
            logger.warning("[ACTION] Unknown action type: %s", action.type)
            # Return error event
            return

        logger.info("[ACTION] Converted to message: %s", message_text)

        # Context is already a RequestContext object (despite type hint saying dict)
        # Use it directly without wrapping

        # Create a synthetic user message with all required fields
        synthetic_message = UserMessageItem(
            id=self.store.generate_item_id("message", thread, context),
            thread_id=thread.id,
            created_at=datetime.now(),
            content=[UserMessageTextContent(type="input_text", text=message_text)],
            inference_options={},
        )

        # Process through the normal respond flow
        async for event in self.respond(thread, synthetic_message, context):
            yield event

    def _action_to_message(self, action_type: str, payload: dict[str, Any]) -> str | None:
        """
        Convert a widget action to a natural language message.

        Args:
            action_type: The type of action (e.g., "task.start", "task.complete")
            payload: The action payload with parameters

        Returns:
            Natural language message or None if action unknown
        """
        task_id = payload.get("task_id")
        project_id = payload.get("project_id")

        # Task actions
        if action_type == "task.start":
            return f"Start task {task_id}"
        elif action_type == "task.complete":
            return f"Complete task {task_id}"
        elif action_type == "task.request_review":
            return f"Request review for task {task_id}"
        elif action_type == "task.reject":
            return f"Reject task {task_id} and return to in progress"
        elif action_type == "task.unblock":
            return f"Unblock task {task_id} and return to in progress"
        elif action_type == "task.reopen":
            return f"Reopen task {task_id} and return to pending"
        elif action_type == "task.create_form":
            return "Show me the task creation form" + (
                f" for project {project_id}" if project_id else ""
            )
        elif action_type == "task.refresh":
            return "Refresh and show all my tasks"
        elif action_type == "task.create":
            # Form submission - extract form data from payload
            title = payload.get("task", {}).get("title") or payload.get("title", "")
            description = payload.get("task", {}).get("description") or payload.get("description")
            priority = payload.get("task", {}).get("priority") or payload.get("priority", "medium")
            recurrence_pattern = payload.get("task", {}).get("recurrencePattern") or payload.get(
                "recurrence_pattern"
            )
            max_occurrences = payload.get("task", {}).get("maxOccurrences") or payload.get(
                "max_occurrences"
            )

            message = f"Create a new task: {title}"
            if description:
                message += f" - {description}"
            message += f" with priority {priority}"
            if recurrence_pattern:
                message += f", recurring {recurrence_pattern}"
                if max_occurrences:
                    message += f" (max {max_occurrences} times)"
            if project_id:
                message += f" in project {project_id}"
            return message

        # Project actions
        elif action_type == "project.create":
            return "Show me the project creation form"

        # Client-side actions (these shouldn't reach the server, but handle gracefully)
        elif action_type in ["task.view", "project.view", "form.cancel"]:
            logger.warning("[ACTION] Client-side action reached server: %s", action_type)
            return None

        # Unknown action
        else:
            logger.warning("[ACTION] Unknown action type: %s", action_type)
            return None

    async def respond(
        self,
        thread: ThreadMetadata,
        input_user_message: UserMessageItem | None,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """
        Generate response for user message using TaskFlow agent with MCP.

        Args:
            thread: Thread metadata
            input_user_message: User's message (None for retry scenarios)
            context: Request context with user_id and metadata

        Yields:
            ThreadStreamEvent: Stream of chat events
        """
        if not input_user_message:
            logger.info("No user message provided - this is likely a read-only operation")
            return

        try:
            # Extract user message
            user_text = _user_message_text(input_user_message)
            if not user_text:
                logger.warning("Empty user message")
                return

            # Extract user info and auth token from context
            user_id = context.user_id  # From X-User-ID header
            access_token = context.metadata.get("access_token", "")  # From Authorization header
            user_name = context.metadata.get("user_name") or context.user_id
            project_name = context.metadata.get("project_name")
            project_id = context.metadata.get("project_id")

            # Get previous messages from thread for context (last 20)
            previous_items = await self.store.load_thread_items(
                thread.id,
                after=None,
                limit=20,
                order="desc",
                context=context,
            )

            # Build message history for agent
            messages = []
            for item in reversed(previous_items.data):
                if isinstance(item, UserMessageItem):
                    messages.append({"role": "user", "content": _user_message_text(item)})
                elif isinstance(item, AssistantMessageItem):
                    messages.append(
                        {
                            "role": "assistant",
                            "content": item.content[0].text if item.content else "",
                        }
                    )

            # Add current message
            messages.append({"role": "user", "content": user_text})

            # Create history string for agent prompt
            history_str = "\n".join([f"{m['role']}: {m['content']}" for m in messages])

            logger.info(
                "Running TaskFlow agent for user %s with %d messages in history, MCP: %s",
                context.user_id,
                len(messages) - 1,
                self.mcp_server_url,
            )
            logger.debug(
                "Auth context - user_id: %s, access_token present: %s",
                user_id,
                bool(access_token),
            )

            # Connect to MCP server and run agent
            # Block MCP tools that we've replaced with local wrappers (for widget support)
            async with MCPServerStreamableHttp(
                name="TaskFlow MCP",
                params={
                    "url": self.mcp_server_url,
                    "timeout": 30,
                },
                cache_tools_list=True,
                max_retry_attempts=3,
                tool_filter={
                    "blocked_tool_names": [
                        "taskflow_list_tasks",  # Replaced by local list_tasks
                        "taskflow_add_task",  # Replaced by local add_task
                        "taskflow_list_projects",  # Replaced by local list_projects
                    ]
                },
            ) as mcp_server:
                # Create agent context with MCP server reference
                # This allows our widget tools to call MCP tools internally
                agent_context = TaskFlowAgentContext(
                    thread=thread,
                    store=self.store,
                    request_context=context,
                    mcp_server=mcp_server,  # Pass MCP server for widget tools
                    # Cache user auth and project info for easy access in tools
                    user_id=user_id,
                    project_id=project_id,
                    project_name=project_name,
                    access_token=access_token,
                    mcp_server_url=self.mcp_server_url,
                )

                # Format system prompt with user context and auth token
                instructions = TASKFLOW_SYSTEM_PROMPT.format(
                    user_id=user_id,
                    access_token=access_token,
                    user_name=user_name,
                    project_name=project_name or "No project selected",
                    project_id=project_id or "N/A",
                    history=history_str,
                )

                # Create agent with LOCAL tools for widget-enabled operations
                # Local tools call MCP via HTTP, enabling on_tool_end hooks for widget streaming
                # MCP server is still available for other operations
                agent = Agent[TaskFlowAgentContext](
                    name="TaskFlow Assistant",
                    instructions=instructions,
                    tools=[
                        list_tasks,  # Local wrapper -> triggers task list widget
                        add_task,  # Local wrapper -> triggers task created widget
                        show_task_form,  # Local wrapper -> triggers task form widget
                        list_projects,  # Local wrapper -> triggers projects widget
                    ],
                    mcp_servers=[mcp_server],  # Keep MCP for other tools (complete_task, etc.)
                )

                # Create widget streaming hooks to intercept local tool results
                # and automatically stream widgets to the UI
                hooks = WidgetStreamingHooks()

                # Run agent with streaming and hooks
                result = Runner.run_streamed(
                    agent,
                    user_text,
                    context=agent_context,
                    hooks=hooks,
                )
                async for event in stream_agent_response(agent_context, result):
                    yield event

            logger.info("TaskFlow agent response completed for user %s", context.user_id)

        except ConnectionError as e:
            logger.error("MCP server connection failed: %s", e)
            error_message = AssistantMessageItem(
                id=self.store.generate_item_id("message", thread, context),
                thread_id=thread.id,
                created_at=datetime.now(),
                content=[
                    AssistantMessageContent(
                        text="I'm having trouble connecting to the task management service. "
                        "Please try again in a moment, or check if the MCP server is running.",
                        annotations=[],
                    )
                ],
            )
            yield ThreadItemDoneEvent(item=error_message)

        except Exception as e:
            logger.exception("Error in TaskFlow agent: %s", e)
            error_message = AssistantMessageItem(
                id=self.store.generate_item_id("message", thread, context),
                thread_id=thread.id,
                created_at=datetime.now(),
                content=[
                    AssistantMessageContent(
                        text="I apologize, but I encountered an error processing your request. "
                        "Please try again.",
                        annotations=[],
                    )
                ],
            )
            yield ThreadItemDoneEvent(item=error_message)

    async def _handle_task_complete(
        self,
        mcp_server: MCPServerStreamableHttp,
        payload: dict,
        context: RequestContext,
    ) -> dict:
        """Handle task.complete action via MCP."""
        task_id = payload.get("task_id")
        if not task_id:
            raise ValueError("task_id required")

        # Call MCP tool to complete task
        await mcp_server.call_tool(
            "taskflow_complete_task",
            {
                "task_id": task_id,
                "user_id": context.user_id,
                "access_token": context.metadata.get("access_token", ""),
            },
        )

        # Fetch updated task list
        tasks_result = await mcp_server.call_tool(
            "taskflow_list_tasks",
            {
                "user_id": context.user_id,
                "access_token": context.metadata.get("access_token", ""),
                "project_id": context.metadata.get("project_id"),
            },
        )
        tasks_data = _parse_mcp_result(tasks_result)
        tasks = tasks_data if isinstance(tasks_data, list) else []

        return {
            "message": f"Task #{task_id} marked as completed!",
            "tasks": tasks,
        }

    async def _handle_task_start(
        self,
        mcp_server: MCPServerStreamableHttp,
        payload: dict,
        context: RequestContext,
    ) -> dict:
        """Handle task.start action via MCP."""
        task_id = payload.get("task_id")
        if not task_id:
            raise ValueError("task_id required")

        # Call MCP tool to start task
        await mcp_server.call_tool(
            "taskflow_start_task",
            {
                "task_id": task_id,
                "user_id": context.user_id,
                "access_token": context.metadata.get("access_token", ""),
            },
        )

        # Fetch updated task list
        tasks_result = await mcp_server.call_tool(
            "taskflow_list_tasks",
            {
                "user_id": context.user_id,
                "access_token": context.metadata.get("access_token", ""),
                "project_id": context.metadata.get("project_id"),
            },
        )
        tasks_data = _parse_mcp_result(tasks_result)
        tasks = tasks_data if isinstance(tasks_data, list) else []

        return {
            "message": f"Task #{task_id} started!",
            "tasks": tasks,
        }

    async def _handle_task_refresh(
        self,
        mcp_server: MCPServerStreamableHttp,
        payload: dict,
        context: RequestContext,
    ) -> dict:
        """Handle task.refresh action via MCP."""
        # Fetch current task list
        tasks_result = await mcp_server.call_tool(
            "taskflow_list_tasks",
            {
                "user_id": context.user_id,
                "access_token": context.metadata.get("access_token", ""),
                "project_id": payload.get("project_id") or context.metadata.get("project_id"),
            },
        )
        tasks_data = _parse_mcp_result(tasks_result)
        tasks = tasks_data if isinstance(tasks_data, list) else []

        return {
            "message": "Tasks refreshed",
            "tasks": tasks,
        }

    async def _handle_task_create(
        self,
        mcp_server: MCPServerStreamableHttp,
        payload: dict,
        context: RequestContext,
    ) -> dict:
        """Handle task.create action via MCP.

        Handles both form submissions (with task.* field names) and direct action calls.
        """
        # Map form field names (task.title, task.description, etc.) to handler params
        title = payload.get("task.title") or payload.get("title")
        description = payload.get("task.description") or payload.get("description")
        priority = payload.get("task.priority") or payload.get("priority", "medium")
        assignee_id = payload.get("task.assigneeId") or payload.get("assigned_to")
        recurrence_pattern = payload.get("task.recurrencePattern") or payload.get(
            "recurrence_pattern"
        )
        max_occurrences_str = payload.get("task.maxOccurrences") or payload.get("max_occurrences")

        if not title:
            raise ValueError("title required")

        # Parse max_occurrences as integer if provided
        max_occurrences = None
        if max_occurrences_str:
            try:
                max_occurrences = int(max_occurrences_str)
            except (ValueError, TypeError):
                pass

        # Build MCP tool arguments
        mcp_args: dict[str, Any] = {
            "title": title,
            "description": description,
            "priority": priority,
            "assigned_to": assignee_id,
            "project_id": payload.get("project_id") or context.metadata.get("project_id"),
            "user_id": context.user_id,
            "access_token": context.metadata.get("access_token", ""),
        }

        # Add recurring fields if pattern is set
        if recurrence_pattern:
            mcp_args["is_recurring"] = True
            mcp_args["recurrence_pattern"] = recurrence_pattern
            if max_occurrences:
                mcp_args["max_occurrences"] = max_occurrences

        # Call MCP tool to create task
        result = await mcp_server.call_tool("taskflow_add_task", mcp_args)
        data = _parse_mcp_result(result)
        task_id = data.get("task_id") if isinstance(data, dict) else None
        project_name = context.metadata.get("project_name")

        # Build confirmation message
        message = f"Task '{title}' created successfully!"
        if recurrence_pattern:
            message = f"Recurring task '{title}' created! It will repeat {recurrence_pattern}."

        return {
            "message": message,
            "confirmation": build_task_created_confirmation(
                task_id=task_id or 0,
                title=title,
                project_name=project_name,
            ),
        }

    async def _handle_task_create_form(
        self,
        mcp_server: MCPServerStreamableHttp,
        payload: dict,
        context: RequestContext,
    ) -> dict:
        """Handle task.create_form action - show form widget."""
        project_id = payload.get("project_id") or context.metadata.get("project_id")
        project_name = context.metadata.get("project_name")

        # Fetch project members for assignee dropdown
        members = []
        try:
            members_result = await mcp_server.call_tool(
                "taskflow_list_workers",
                {
                    "user_id": context.user_id,
                    "access_token": context.metadata.get("access_token", ""),
                },
            )
            data = _parse_mcp_result(members_result)
            members = (
                data
                if isinstance(data, list)
                else data.get("workers", [])
                if isinstance(data, dict)
                else []
            )
        except Exception:
            logger.warning("Could not fetch members for form")

        return {
            "message": "Fill in the task details below:",
            "form": build_task_form_widget(
                project_id=project_id,
                project_name=project_name,
                members=members,
            ),
        }

    async def _handle_audit_show(
        self,
        mcp_server: MCPServerStreamableHttp,
        payload: dict,
        context: RequestContext,
    ) -> dict:
        """Handle audit.show action via MCP."""
        entity_type = payload.get("entity_type", "task")
        entity_id = payload.get("entity_id") or payload.get("task_id")

        if not entity_id:
            raise ValueError("entity_id or task_id required")

        # Fetch audit log
        audit_result = await mcp_server.call_tool(
            "taskflow_get_audit_log",
            {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "user_id": context.user_id,
                "access_token": context.metadata.get("access_token", ""),
            },
        )
        data = _parse_mcp_result(audit_result)

        audit_entries = []
        entity_title = None
        if isinstance(data, dict):
            audit_entries = data.get("entries", [])
            entity_title = data.get("entity_title")
        elif isinstance(data, list):
            audit_entries = data

        return {
            "message": f"Showing history for {entity_type} #{entity_id}",
            "audit": build_audit_timeline_widget(
                audit_entries=audit_entries,
                entity_type=entity_type,
                entity_id=entity_id,
                entity_title=entity_title,
            ),
        }


def create_chatkit_server(store: PostgresStore, mcp_server_url: str) -> TaskFlowChatKitServer:
    """Create a configured TaskFlow ChatKit server instance.

    Args:
        store: PostgreSQL store for conversation persistence
        mcp_server_url: URL of TaskFlow MCP Server

    Returns:
        Configured TaskFlowChatKitServer instance
    """
    return TaskFlowChatKitServer(store, mcp_server_url)
