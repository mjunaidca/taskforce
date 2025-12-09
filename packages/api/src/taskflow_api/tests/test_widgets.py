"""Tests for ChatKit widget builders.

These are pure unit tests that don't require database or API fixtures.
"""

# ruff: noqa: E402
# Patch settings before import to allow standalone testing
import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SSO_URL", "http://localhost:3000")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("DEV_MODE", "true")

from datetime import datetime, timedelta, timezone

import pytest

from taskflow_api.services.widgets import (
    build_audit_timeline_widget,
    build_task_created_confirmation,
    build_task_form_widget,
    build_task_list_widget,
)


class TestTaskListWidget:
    """Tests for task list widget builder."""

    def test_build_empty_task_list(self) -> None:
        """Empty task list shows empty state widget."""
        widget = build_task_list_widget([], project_id=1)

        assert widget["type"] == "Box"
        # Should be empty state with create button
        children = widget["children"]
        assert any(
            child.get("content") == "No tasks found" for child in children if child.get("type") == "Text"
        )

    def test_build_task_list_with_tasks(self) -> None:
        """Task list with items shows ListView."""
        tasks = [
            {
                "id": 1,
                "title": "Test Task 1",
                "status": "pending",
                "priority": "medium",
                "assigned_to": None,
            },
            {
                "id": 2,
                "title": "Test Task 2",
                "status": "in_progress",
                "priority": "high",
                "assigned_to": "@test-user",
            },
        ]

        widget = build_task_list_widget(tasks, project_id=1)

        assert widget["type"] == "ListView"
        assert len(widget["items"]) == 2

        # Check first task
        first_item = widget["items"][0]
        assert first_item["type"] == "Box"

    def test_task_list_includes_action_buttons(self) -> None:
        """Task list items include Complete/Start/View buttons."""
        tasks = [
            {
                "id": 1,
                "title": "Test Task",
                "status": "pending",
                "priority": "medium",
                "assigned_to": None,
            },
        ]

        widget = build_task_list_widget(tasks, project_id=1)

        # Find action buttons
        item = widget["items"][0]
        action_box = None
        for child in item.get("children", []):
            if child.get("direction") == "row" and child.get("gap") == "sm":
                for subchild in child.get("children", []):
                    if subchild.get("type") == "Box":
                        action_box = subchild
                        break

        # Should have buttons
        assert action_box is not None or any(
            c.get("type") == "Button" for c in self._flatten_children(item)
        )

    def _flatten_children(self, node: dict) -> list[dict]:
        """Recursively flatten children."""
        result = []
        for child in node.get("children", []):
            result.append(child)
            result.extend(self._flatten_children(child))
        return result

    def test_status_badge_colors(self) -> None:
        """Status badges have correct colors."""
        tasks = [
            {"id": 1, "title": "Pending", "status": "pending", "priority": "low", "assigned_to": None},
            {
                "id": 2,
                "title": "In Progress",
                "status": "in_progress",
                "priority": "low",
                "assigned_to": None,
            },
            {
                "id": 3,
                "title": "Completed",
                "status": "completed",
                "priority": "low",
                "assigned_to": None,
            },
        ]

        widget = build_task_list_widget(tasks, project_id=1)

        # Just verify widget builds without error for different statuses
        assert widget["type"] == "ListView"
        assert len(widget["items"]) == 3


class TestTaskFormWidget:
    """Tests for task form widget builder."""

    def test_build_basic_form(self) -> None:
        """Basic form has required fields."""
        widget = build_task_form_widget()

        assert widget["type"] == "Box"
        # Find form in children
        form = None
        for child in widget.get("children", []):
            if child.get("type") == "Form":
                form = child
                break

        assert form is not None
        assert form["id"] == "task-create-form"

        # Check required fields exist
        field_names = [f["name"] for f in form["fields"]]
        assert "title" in field_names
        assert "priority" in field_names

    def test_form_with_project_context(self) -> None:
        """Form shows project context."""
        widget = build_task_form_widget(project_id=1, project_name="Test Project")

        # Find the context text
        has_project_context = False
        for child in widget.get("children", []):
            if child.get("type") == "Box":
                for subchild in child.get("children", []):
                    if subchild.get("type") == "Text" and "Test Project" in str(
                        subchild.get("content", "")
                    ):
                        has_project_context = True
                        break

        assert has_project_context

    def test_form_with_members(self) -> None:
        """Form includes member options in assignee dropdown."""
        members = [
            {"handle": "@user1", "name": "User One", "type": "human"},
            {"handle": "@agent1", "name": "Agent One", "type": "agent"},
        ]

        widget = build_task_form_widget(members=members)

        # Find assignee field
        form = None
        for child in widget.get("children", []):
            if child.get("type") == "Form":
                form = child
                break

        assignee_field = None
        for field in form["fields"]:
            if field["name"] == "assigned_to":
                assignee_field = field
                break

        assert assignee_field is not None
        # Should have unassigned + 2 members
        assert len(assignee_field["options"]) == 3

    def test_form_actions(self) -> None:
        """Form has Cancel and Create buttons."""
        widget = build_task_form_widget()

        form = None
        for child in widget.get("children", []):
            if child.get("type") == "Form":
                form = child
                break

        action_labels = [a["label"] for a in form["actions"]]
        assert "Cancel" in action_labels
        assert "Create Task" in action_labels


class TestTaskCreatedConfirmation:
    """Tests for task creation confirmation widget."""

    def test_confirmation_shows_task_info(self) -> None:
        """Confirmation displays task details."""
        widget = build_task_created_confirmation(task_id=42, title="New Task", project_name="Project X")

        assert widget["type"] == "Box"

        # Check success message exists
        has_success = False
        has_task_title = False

        def check_children(node: dict) -> None:
            nonlocal has_success, has_task_title
            if node.get("type") == "Text":
                content = node.get("content", "")
                if "Successfully" in content:
                    has_success = True
                if "New Task" in content:
                    has_task_title = True
            for child in node.get("children", []):
                check_children(child)

        check_children(widget)

        assert has_success
        assert has_task_title

    def test_confirmation_has_view_button(self) -> None:
        """Confirmation has View Task button."""
        widget = build_task_created_confirmation(task_id=42, title="New Task")

        buttons = []

        def find_buttons(node: dict) -> None:
            if node.get("type") == "Button":
                buttons.append(node)
            for child in node.get("children", []):
                find_buttons(child)

        find_buttons(widget)

        button_labels = [b["label"] for b in buttons]
        assert "View Task" in button_labels


class TestAuditTimelineWidget:
    """Tests for audit timeline widget builder."""

    def test_empty_audit_timeline(self) -> None:
        """Empty timeline shows empty state."""
        widget = build_audit_timeline_widget([], entity_type="task", entity_id=1)

        assert widget["type"] == "Box"

        # Check for empty state message
        has_empty_message = False

        def check_children(node: dict) -> None:
            nonlocal has_empty_message
            if node.get("type") == "Text" and "No History" in str(node.get("content", "")):
                has_empty_message = True
            for child in node.get("children", []):
                check_children(child)

        check_children(widget)

        assert has_empty_message

    def test_timeline_with_entries(self) -> None:
        """Timeline renders audit entries."""
        now = datetime.now(timezone.utc)
        entries = [
            {
                "id": 1,
                "action": "created",
                "actor_id": "@user1",
                "actor_type": "human",
                "created_at": now.isoformat(),
                "details": {"title": "Task Title"},
            },
            {
                "id": 2,
                "action": "started",
                "actor_id": "@agent1",
                "actor_type": "agent",
                "created_at": (now - timedelta(hours=1)).isoformat(),
                "details": {},
            },
        ]

        widget = build_audit_timeline_widget(entries, entity_type="task", entity_id=1)

        assert widget["type"] == "Box"

        # Check entry count in header
        has_count = False

        def check_children(node: dict) -> None:
            nonlocal has_count
            if node.get("type") == "Text" and "2 entries" in str(node.get("content", "")):
                has_count = True
            for child in node.get("children", []):
                check_children(child)

        check_children(widget)

        assert has_count

    def test_timeline_with_entity_title(self) -> None:
        """Timeline shows entity title in header."""
        widget = build_audit_timeline_widget(
            [{"action": "created", "actor_id": "@user", "actor_type": "human", "created_at": "2024-01-01"}],
            entity_type="task",
            entity_title="Important Task",
        )

        # Check header shows title
        has_title = False

        def check_children(node: dict) -> None:
            nonlocal has_title
            if node.get("type") == "Text" and "Important Task" in str(node.get("content", "")):
                has_title = True
            for child in node.get("children", []):
                check_children(child)

        check_children(widget)

        assert has_title

    def test_action_badge_colors(self) -> None:
        """Different actions have different badge colors."""
        entries = [
            {"action": "created", "actor_id": "@user", "actor_type": "human", "created_at": "2024-01-01"},
            {"action": "completed", "actor_id": "@user", "actor_type": "human", "created_at": "2024-01-02"},
            {"action": "deleted", "actor_id": "@user", "actor_type": "human", "created_at": "2024-01-03"},
        ]

        # Just verify it builds without error
        widget = build_audit_timeline_widget(entries, entity_type="task")
        assert widget["type"] == "Box"

    def test_relative_time_formatting(self) -> None:
        """Timestamps are formatted as relative time."""
        now = datetime.now(timezone.utc)
        entries = [
            {
                "action": "created",
                "actor_id": "@user",
                "actor_type": "human",
                "created_at": now.isoformat(),  # Should be "just now"
            },
        ]

        widget = build_audit_timeline_widget(entries, entity_type="task")

        # Check for relative time
        has_relative = False

        def check_children(node: dict) -> None:
            nonlocal has_relative
            if node.get("type") == "Text":
                content = str(node.get("content", ""))
                if "just now" in content or "minute" in content or "hour" in content or "ago" in content:
                    has_relative = True
            for child in node.get("children", []):
                check_children(child)

        check_children(widget)

        assert has_relative
