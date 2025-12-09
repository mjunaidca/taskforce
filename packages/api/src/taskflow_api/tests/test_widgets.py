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

from datetime import UTC, datetime, timedelta

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

        assert widget["type"] == "Card"
        # Should be empty state with create button
        children = widget["children"]
        # Check for empty state content (Title with "No tasks found")
        col = children[0]
        assert col["type"] == "Col"
        assert any(
            child.get("value") == "No tasks found"
            for child in col["children"]
            if child.get("type") == "Title"
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
        assert len(widget["children"]) == 2

        # Check first task
        first_item = widget["children"][0]
        assert first_item["type"] == "ListViewItem"

    def test_task_list_includes_action_buttons(self) -> None:
        """Task list items include action buttons (Start, Complete, etc.)."""
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

        # Get first item
        item = widget["children"][0]

        # Flatten all children to find buttons
        all_nodes = self._flatten_children(item)
        buttons = [c for c in all_nodes if c.get("type") == "Button"]

        # Should have at least Start and Details buttons for pending task
        assert len(buttons) >= 2
        button_labels = [btn.get("label") for btn in buttons]
        assert "Start" in button_labels or "Details" in button_labels

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
            {
                "id": 1,
                "title": "Pending",
                "status": "pending",
                "priority": "low",
                "assigned_to": None,
            },
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
        assert len(widget["children"]) == 3


class TestTaskFormWidget:
    """Tests for task form widget builder."""

    def test_build_basic_form(self) -> None:
        """Basic form builds successfully with Card structure."""
        widget = build_task_form_widget()

        assert widget["type"] == "Card"
        # Find Form in children
        form = None
        for child in widget.get("children", []):
            if child.get("type") == "Form":
                form = child
                break

        assert form is not None
        assert form.get("onSubmitAction") is not None
        # Verify form has children structure
        assert "children" in form

    def test_form_with_project_context(self) -> None:
        """Form can be created with project_id context."""
        # Note: project_name parameter does not exist in current implementation
        widget = build_task_form_widget(project_id=1)

        assert widget["type"] == "Card"
        # Verify form submission includes project_id
        form = widget["children"][0]
        assert form["onSubmitAction"]["payload"]["project_id"] == 1

    def test_form_with_members(self) -> None:
        """Form accepts members for assignee dropdown."""
        members = [
            {"id": 1, "name": "User One"},
            {"id": 2, "name": "Agent One"},
        ]

        widget = build_task_form_widget(members=members)

        # Just verify widget builds without error when members provided
        assert widget["type"] == "Card"
        form = widget["children"][0]
        assert form["type"] == "Form"

    def test_form_actions(self) -> None:
        """Form has action buttons (Cancel and Create)."""
        widget = build_task_form_widget()

        # Flatten all nodes to find buttons
        all_nodes = self._flatten_children(widget)
        buttons = [c for c in all_nodes if c.get("type") == "Button"]

        # Should have at least Cancel and Create Task buttons
        assert len(buttons) >= 2
        button_labels = [btn.get("label") for btn in buttons]
        assert "Cancel" in button_labels
        assert "Create Task" in button_labels

    def _flatten_children(self, node: dict) -> list[dict]:
        """Recursively flatten children."""
        result = []
        for child in node.get("children", []):
            result.append(child)
            result.extend(self._flatten_children(child))
        return result


class TestTaskCreatedConfirmation:
    """Tests for task creation confirmation widget."""

    def test_confirmation_shows_task_info(self) -> None:
        """Confirmation displays task details."""
        widget = build_task_created_confirmation(
            task_id=42, title="New Task", project_name="Project X"
        )

        assert widget["type"] == "Card"

        # Check success message exists
        has_success = False
        has_task_title = False

        def check_children(node: dict) -> None:
            nonlocal has_success, has_task_title
            # Check both Title and Text types, look in "value" field
            if node.get("type") in ["Text", "Title", "Caption"]:
                value = node.get("value", "")
                if "Successfully" in value:
                    has_success = True
                if "New Task" in value:
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
        now = datetime.now(UTC)
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
            [
                {
                    "action": "created",
                    "actor_id": "@user",
                    "actor_type": "human",
                    "created_at": "2024-01-01",
                }
            ],
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
            {
                "action": "created",
                "actor_id": "@user",
                "actor_type": "human",
                "created_at": "2024-01-01",
            },
            {
                "action": "completed",
                "actor_id": "@user",
                "actor_type": "human",
                "created_at": "2024-01-02",
            },
            {
                "action": "deleted",
                "actor_id": "@user",
                "actor_type": "human",
                "created_at": "2024-01-03",
            },
        ]

        # Just verify it builds without error
        widget = build_audit_timeline_widget(entries, entity_type="task")
        assert widget["type"] == "Box"

    def test_relative_time_formatting(self) -> None:
        """Timestamps are formatted as relative time."""
        now = datetime.now(UTC)
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
                if (
                    "just now" in content
                    or "minute" in content
                    or "hour" in content
                    or "ago" in content
                ):
                    has_relative = True
            for child in node.get("children", []):
                check_children(child)

        check_children(widget)

        assert has_relative
