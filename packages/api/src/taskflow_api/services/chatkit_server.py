"""ChatKit server integration for TaskFlow with MCP.

This module provides the ChatKit server implementation that integrates
with the TaskFlow MCP Server for task management operations.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from datetime import datetime

from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp
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
)

from ..chatkit_store import PostgresStore, RequestContext
from .chat_agent import TASKFLOW_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


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
    """Agent context for TaskFlow with store and request context."""

    def __init__(
        self,
        thread: ThreadMetadata,
        store: PostgresStore,
        request_context: RequestContext,
    ):
        super().__init__(thread=thread, store=store, request_context=request_context)


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

            # Create agent context
            agent_context = TaskFlowAgentContext(
                thread=thread,
                store=self.store,
                request_context=context,
            )

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
            async with MCPServerStreamableHttp(
                name="TaskFlow MCP",
                params={
                    "url": self.mcp_server_url,
                    "timeout": 30,
                },
                cache_tools_list=True,
                max_retry_attempts=3,
            ) as mcp_server:
                # Format system prompt with user context and auth token
                instructions = TASKFLOW_SYSTEM_PROMPT.format(
                    user_id=user_id,
                    access_token=access_token,
                    user_name=user_name,
                    project_name=project_name or "No project selected",
                    project_id=project_id or "N/A",
                    history=history_str,
                )

                agent = Agent(
                    name="TaskFlow Assistant",
                    instructions=instructions,
                    mcp_servers=[mcp_server],  # Tools discovered from MCP!
                )

                # Run agent with streaming
                result = Runner.run_streamed(agent, user_text, context=agent_context)
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


def create_chatkit_server(store: PostgresStore, mcp_server_url: str) -> TaskFlowChatKitServer:
    """Create a configured TaskFlow ChatKit server instance.

    Args:
        store: PostgreSQL store for conversation persistence
        mcp_server_url: URL of TaskFlow MCP Server

    Returns:
        Configured TaskFlowChatKitServer instance
    """
    return TaskFlowChatKitServer(store, mcp_server_url)
