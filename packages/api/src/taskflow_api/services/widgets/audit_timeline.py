"""Audit timeline widget builder for ChatKit.

Builds Timeline widgets for displaying task/project audit history.
"""

from datetime import datetime, timezone
from typing import Any


def build_audit_timeline_widget(
    audit_entries: list[dict[str, Any]],
    entity_type: str = "task",
    entity_id: int | None = None,
    entity_title: str | None = None,
) -> dict[str, Any]:
    """Build an audit timeline widget.

    Args:
        audit_entries: List of audit log entries
        entity_type: Type of entity (task, project)
        entity_id: ID of the entity
        entity_title: Title of the entity for display

    Returns:
        Widget template dictionary for ChatKit rendering
    """
    if not audit_entries:
        return _build_empty_audit_widget(entity_type, entity_id)

    timeline_items = []
    for entry in audit_entries:
        # Parse timestamp
        timestamp = entry.get("created_at")
        if isinstance(timestamp, str):
            try:
                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                relative_time = _format_relative_time(dt)
            except ValueError:
                relative_time = timestamp
        elif isinstance(timestamp, datetime):
            relative_time = _format_relative_time(timestamp)
        else:
            relative_time = "Unknown time"

        # Determine actor icon
        actor_type = entry.get("actor_type", "human")
        actor_icon = "bot" if actor_type == "agent" else "user"
        actor_id = entry.get("actor_id", "Unknown")

        # Action badge color
        action = entry.get("action", "unknown")
        action_color = _get_action_color(action)

        # Build details if available
        details = entry.get("details", {})
        details_children = []
        if details:
            for key, value in details.items():
                if value is not None and key not in ("id", "task_id", "project_id"):
                    details_children.append({
                        "type": "Text",
                        "content": f"{key}: {value}",
                        "size": "xs",
                        "color": "muted",
                    })

        timeline_items.append({
            "type": "Box",
            "direction": "row",
            "gap": "md",
            "padding": "sm",
            "children": [
                # Timeline dot and line
                {
                    "type": "Box",
                    "direction": "column",
                    "align": "center",
                    "children": [
                        {
                            "type": "Icon",
                            "name": actor_icon,
                            "size": "sm",
                            "color": "primary",
                        },
                        {
                            "type": "Box",
                            "style": {
                                "width": "2px",
                                "height": "100%",
                                "backgroundColor": "var(--border)",
                                "minHeight": "20px",
                            },
                        },
                    ],
                },
                # Content
                {
                    "type": "Box",
                    "direction": "column",
                    "gap": "xs",
                    "flex": 1,
                    "children": [
                        {
                            "type": "Box",
                            "direction": "row",
                            "justify": "space-between",
                            "align": "center",
                            "children": [
                                {
                                    "type": "Box",
                                    "direction": "row",
                                    "gap": "xs",
                                    "align": "center",
                                    "children": [
                                        {
                                            "type": "Text",
                                            "content": f"@{actor_id}",
                                            "weight": "medium",
                                            "size": "sm",
                                        },
                                        {
                                            "type": "Badge",
                                            "label": action.replace("_", " ").title(),
                                            "color": action_color,
                                            "size": "sm",
                                        },
                                    ],
                                },
                                {
                                    "type": "Text",
                                    "content": relative_time,
                                    "size": "xs",
                                    "color": "muted",
                                },
                            ],
                        },
                        *details_children,
                    ],
                },
            ],
        })

    # Remove the line from last item
    if timeline_items:
        last_item = timeline_items[-1]
        if last_item["children"] and len(last_item["children"]) > 0:
            timeline_col = last_item["children"][0]
            if timeline_col.get("children") and len(timeline_col["children"]) > 1:
                timeline_col["children"] = [timeline_col["children"][0]]  # Keep only icon

    header_text = f"History for {entity_type.title()}"
    if entity_title:
        header_text = f"History: {entity_title}"
    elif entity_id:
        header_text = f"History for {entity_type.title()} #{entity_id}"

    return {
        "type": "Box",
        "direction": "column",
        "gap": "md",
        "padding": "md",
        "border": True,
        "borderRadius": "lg",
        "children": [
            {
                "type": "Box",
                "direction": "row",
                "justify": "space-between",
                "align": "center",
                "children": [
                    {
                        "type": "Text",
                        "content": header_text,
                        "weight": "bold",
                        "size": "md",
                    },
                    {
                        "type": "Text",
                        "content": f"{len(audit_entries)} entries",
                        "size": "sm",
                        "color": "muted",
                    },
                ],
            },
            {
                "type": "Box",
                "direction": "column",
                "gap": "none",
                "children": timeline_items,
            },
        ],
    }


def _build_empty_audit_widget(
    entity_type: str,
    entity_id: int | None,
) -> dict[str, Any]:
    """Build empty state widget when no audit entries exist."""
    return {
        "type": "Box",
        "direction": "column",
        "align": "center",
        "justify": "center",
        "gap": "md",
        "padding": "xl",
        "border": True,
        "borderRadius": "lg",
        "children": [
            {
                "type": "Icon",
                "name": "clock",
                "size": "xl",
                "color": "muted",
            },
            {
                "type": "Text",
                "content": "No History Yet",
                "size": "lg",
                "weight": "medium",
            },
            {
                "type": "Text",
                "content": f"This {entity_type} has no recorded activity",
                "size": "sm",
                "color": "muted",
            },
        ],
    }


def _format_relative_time(dt: datetime) -> str:
    """Format datetime as relative time string."""
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    diff = now - dt
    seconds = diff.total_seconds()

    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif seconds < 604800:
        days = int(seconds / 86400)
        return f"{days} day{'s' if days != 1 else ''} ago"
    else:
        return dt.strftime("%b %d, %Y")


def _get_action_color(action: str) -> str:
    """Get badge color for action type."""
    action_colors = {
        "created": "blue",
        "started": "yellow",
        "completed": "green",
        "progressed": "blue",
        "updated": "gray",
        "assigned": "purple",
        "unassigned": "gray",
        "deleted": "red",
        "member_added": "green",
        "member_removed": "red",
    }
    return action_colors.get(action, "gray")
