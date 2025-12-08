"""
Complete Server Action Handler Pattern
From: blueprints/openai-chatkit-advanced-samples-main/examples/metro-map/backend/app/server.py

This file shows the complete pattern for handling server-side widget actions in ChatKit.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, AsyncIterator

from agents import Runner
from chatkit.agents import stream_agent_response
from chatkit.server import ChatKitServer
from chatkit.types import (
    Action,
    AssistantMessageContent,
    AssistantMessageItem,
    Attachment,
    ClientEffectEvent,
    HiddenContextItem,
    ThreadItemDoneEvent,
    ThreadItemReplacedEvent,
    ThreadMetadata,
    ThreadStreamEvent,
    UserMessageItem,
    WidgetItem,
)
from openai.types.responses import ResponseInputContentParam


class ExampleChatKitServer(ChatKitServer[dict[str, Any]]):
    """Example ChatKit server with action handling."""

    def __init__(self) -> None:
        from .memory_store import MemoryStore
        self.store = MemoryStore()
        super().__init__(self.store)

    # =========================================================================
    # REQUIRED: respond() - Handle user messages
    # =========================================================================
    async def respond(
        self,
        thread: ThreadMetadata,
        item: UserMessageItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Handle user message and generate response."""

        # Load conversation history
        items_page = await self.store.load_thread_items(
            thread.id,
            after=None,
            limit=20,
            order="desc",
            context=context,
        )
        items = list(reversed(items_page.data))

        # Convert to agent input format
        input_items = await self.thread_item_converter.to_agent_input(items)

        # Create agent context (available in tool calls)
        agent_context = MyAgentContext(
            thread=thread,
            store=self.store,
            request_context=context,
        )

        # Run agent with streaming
        result = Runner.run_streamed(my_agent, input_items, context=agent_context)

        # Yield events to client
        async for event in stream_agent_response(agent_context, result):
            yield event

    # =========================================================================
    # REQUIRED: action() - Handle widget actions with handler="server"
    # =========================================================================
    async def action(
        self,
        thread: ThreadMetadata,
        action: Action[str, Any],
        sender: WidgetItem | None,  # The widget that triggered the action
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Handle server-side widget actions."""

        # Route by action type
        if action.type == "line.select":
            async for event in self._handle_line_select(
                thread, action.payload, sender, context
            ):
                yield event
            return

        if action.type == "task.approve":
            async for event in self._handle_task_approve(
                thread, action.payload, sender, context
            ):
                yield event
            return

        # Unknown action - do nothing
        return

    # =========================================================================
    # PATTERN: Complete action handler with all response types
    # =========================================================================
    async def _handle_line_select(
        self,
        thread: ThreadMetadata,
        payload: dict[str, Any],
        sender: WidgetItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        """
        Complete action handler showing all response patterns:
        1. Update the widget that triggered the action
        2. Add hidden context for future agent input
        3. Send assistant message
        4. Trigger client effect for UI update
        """
        line_id = payload["id"]

        # -----------------------------------------------------------------
        # 1. UPDATE WIDGET - Replace with new state (e.g., show selection)
        # -----------------------------------------------------------------
        updated_widget = build_widget(
            items=self.get_items(),
            selected=line_id,  # Now shows as selected
        )

        if sender:
            updated_widget_item = sender.model_copy(update={"widget": updated_widget})
            yield ThreadItemReplacedEvent(item=updated_widget_item)

        # -----------------------------------------------------------------
        # 2. ADD HIDDEN CONTEXT - Agent sees this on next message
        # -----------------------------------------------------------------
        await self.store.add_thread_item(
            thread.id,
            HiddenContextItem(
                id=self.store.generate_item_id("ctx", thread, context),
                thread_id=thread.id,
                created_at=datetime.now(),
                content=f"<LINE_SELECTED>{line_id}</LINE_SELECTED>",
            ),
            context=context,
        )

        # -----------------------------------------------------------------
        # 3. SEND ASSISTANT MESSAGE - Acknowledge the action
        # -----------------------------------------------------------------
        yield ThreadItemDoneEvent(
            item=AssistantMessageItem(
                thread_id=thread.id,
                id=self.store.generate_item_id("msg", thread, context),
                created_at=datetime.now(),
                content=[
                    AssistantMessageContent(
                        text="Would you like to add the station to the beginning or end?"
                    )
                ],
            ),
        )

        # -----------------------------------------------------------------
        # 4. TRIGGER CLIENT EFFECT - Update frontend state
        # -----------------------------------------------------------------
        yield ClientEffectEvent(
            name="location_select_mode",
            data={"lineId": line_id},
        )

    # =========================================================================
    # PATTERN: Simple action - just update widget
    # =========================================================================
    async def _handle_task_approve(
        self,
        thread: ThreadMetadata,
        payload: dict[str, Any],
        sender: WidgetItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Simple action that just updates the widget."""
        task_id = payload["task_id"]

        # Update database
        await self.db.approve_task(task_id)

        # Update widget to show approved state
        updated_widget = build_task_widget(
            task=await self.db.get_task(task_id),
            status="approved",
        )

        if sender:
            yield ThreadItemReplacedEvent(
                item=sender.model_copy(update={"widget": updated_widget})
            )

    # =========================================================================
    # REQUIRED: Handle attachments (can raise if not supported)
    # =========================================================================
    async def to_message_content(self, _input: Attachment) -> ResponseInputContentParam:
        raise RuntimeError("File attachments are not supported.")


# =========================================================================
# Factory function
# =========================================================================
def create_chatkit_server() -> ExampleChatKitServer | None:
    """Create server instance, return None if dependencies missing."""
    try:
        return ExampleChatKitServer()
    except ImportError:
        return None
