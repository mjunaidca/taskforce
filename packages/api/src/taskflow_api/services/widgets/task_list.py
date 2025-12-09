"""Task list widget builder for ChatKit.

Builds interactive ListView widgets for task display with
Complete, Start, and View action buttons.
"""

from typing import Any


def build_task_list_widget(
    tasks: list[dict[str, Any]],
    project_id: int | None = None,
) -> dict[str, Any]:
    """Build a task list widget template.

    Args:
        tasks: List of task dictionaries with id, title, status, priority, assigned_to
        project_id: Optional project ID for context

    Returns:
        Widget template dictionary for ChatKit rendering
    """
    if not tasks:
        return {
            "type": "Card",
            "size": "sm",
            "children": [
                {
                    "type": "Col",
                    "align": "center",
                    "gap": 2,
                    "padding": 4,
                    "children": [
                        {
                            "type": "Title",
                            "value": "No tasks found",
                            "size": "md",
                        },
                        {
                            "type": "Text",
                            "value": "Create your first task to get started",
                            "color": "secondary",
                        },
                        {
                            "type": "Row",
                            "children": [
                                {
                                    "type": "Button",
                                    "label": "Create Task",
                                    "style": "primary",
                                    "onClickAction": {
                                        "type": "task.create_form",
                                        "handler": "server",
                                        "payload": {"project_id": project_id},
                                    },
                                }
                            ],
                        },
                    ],
                }
            ],
        }

    # Build list items
    items = []
    for task in tasks:
        task_id = task.get("id")
        title = task.get("title", "Untitled")
        status = task.get("status", "pending")
        priority = task.get("priority", "medium")
        assignee_handle = task.get("assignee_handle")

        # Status badge color mapping
        status_badge_colors = {
            "pending": "gray",
            "in_progress": "blue",
            "completed": "green",
            "review": "yellow",
            "blocked": "red",
        }
        status_badge_color = status_badge_colors.get(status, "gray")
        status_label = status.replace("_", " ").title()

        # Priority badge color mapping
        priority_badge_colors = {
            "low": "gray",
            "medium": "yellow",
            "high": "orange",
            "urgent": "red",
        }
        priority_badge_color = priority_badge_colors.get(priority, "yellow")
        priority_label = priority.title()

        # Stripe color for visual status indicator
        stripe_colors = {
            "pending": "gray-300",
            "in_progress": "blue-500",
            "completed": "green-500",
            "review": "yellow-500",
            "blocked": "red-500",
        }
        stripe_color = stripe_colors.get(status, "gray-300")

        # Get assignee initial
        assignee_initial = None
        if assignee_handle:
            # Remove @ if present
            name = assignee_handle.lstrip("@")
            assignee_initial = name[0].upper() if name else None

        # Action buttons based on status - now with clear labels
        action_buttons = []

        if status == "pending":
            # Pending: Can Start
            action_buttons.append({
                "type": "Button",
                "label": "Start",
                "iconStart": "play",
                "size": "sm",
                "style": "primary",
                "onClickAction": {
                    "type": "task.start",
                    "handler": "server",
                    "payload": {"task_id": task_id},
                },
            })
        elif status == "in_progress":
            # In Progress: Can Complete or Request Review
            action_buttons.extend([
                {
                    "type": "Button",
                    "label": "Complete",
                    "iconStart": "check",
                    "size": "sm",
                    "style": "primary",
                    "color": "success",
                    "onClickAction": {
                        "type": "task.complete",
                        "handler": "server",
                        "payload": {"task_id": task_id},
                    },
                },
                {
                    "type": "Button",
                    "label": "Review",
                    "iconStart": "eye",
                    "size": "sm",
                    "variant": "outline",
                    "onClickAction": {
                        "type": "task.request_review",
                        "handler": "server",
                        "payload": {"task_id": task_id},
                    },
                },
            ])
        elif status == "review":
            # Review: Can Approve (Complete) or Reject (Back to In Progress)
            action_buttons.extend([
                {
                    "type": "Button",
                    "label": "Approve",
                    "iconStart": "check",
                    "size": "sm",
                    "style": "primary",
                    "color": "success",
                    "onClickAction": {
                        "type": "task.complete",
                        "handler": "server",
                        "payload": {"task_id": task_id},
                    },
                },
                {
                    "type": "Button",
                    "label": "Reject",
                    "iconStart": "x",
                    "size": "sm",
                    "variant": "outline",
                    "color": "error",
                    "onClickAction": {
                        "type": "task.reject",
                        "handler": "server",
                        "payload": {"task_id": task_id},
                    },
                },
            ])
        elif status == "blocked":
            # Blocked: Can Unblock (back to In Progress)
            action_buttons.append({
                "type": "Button",
                "label": "Unblock",
                "iconStart": "unlock",
                "size": "sm",
                "style": "primary",
                "onClickAction": {
                    "type": "task.unblock",
                    "handler": "server",
                    "payload": {"task_id": task_id},
                },
            })
        elif status == "completed":
            # Completed: Can View or Reopen
            action_buttons.append({
                "type": "Button",
                "label": "Reopen",
                "iconStart": "refresh",
                "size": "sm",
                "variant": "outline",
                "onClickAction": {
                    "type": "task.reopen",
                    "handler": "server",
                    "payload": {"task_id": task_id},
                },
            })

        # Always add a View Details button
        action_buttons.append({
            "type": "Button",
            "label": "Details",
            "iconStart": "info",
            "size": "sm",
            "variant": "ghost",
            "onClickAction": {
                "type": "task.view",
                "handler": "client",
                "payload": {"task_id": task_id},
            },
        })

        # Build list item
        item = {
            "type": "ListViewItem",
            "gap": 2,
            "align": "stretch",
            "onClickAction": {
                "type": "task.view",
                "handler": "client",
                "payload": {"task_id": task_id},
            },
            "children": [
                {
                    "type": "Box",
                    "width": "100%",
                    "border": {"bottom": 1},
                    "padding": {"y": 2},
                    "children": [
                        {
                            "type": "Row",
                            "gap": 3,
                            "align": "center",
                            "children": [
                                # Status stripe
                                {
                                    "type": "Box",
                                    "width": 3,
                                    "height": "36px",
                                    "radius": "full",
                                    "background": stripe_color,
                                },
                                # Task info
                                {
                                    "type": "Col",
                                    "gap": 0,
                                    "flex": "auto",
                                    "children": [
                                        {
                                            "type": "Row",
                                            "gap": 2,
                                            "align": "center",
                                            "children": (
                                                [
                                                    {
                                                        "type": "Box",
                                                        "size": 22,
                                                        "radius": "full",
                                                        "background": "alpha-10",
                                                        "align": "center",
                                                        "justify": "center",
                                                        "children": [
                                                            {
                                                                "type": "Caption",
                                                                "value": assignee_initial,
                                                                "size": "sm",
                                                            }
                                                        ],
                                                    }
                                                ]
                                                if assignee_initial
                                                else []
                                            )
                                            + [
                                                {
                                                    "type": "Text",
                                                    "value": title,
                                                    "size": "sm",
                                                    "weight": "semibold",
                                                    "maxLines": 1,
                                                }
                                            ],
                                        },
                                        {
                                            "type": "Caption",
                                            "value": f"#{task_id}",
                                            "color": "tertiary",
                                        },
                                    ],
                                },
                                # Badges
                                {
                                    "type": "Col",
                                    "gap": 1,
                                    "align": "start",
                                    "children": [
                                        {
                                            "type": "Badge",
                                            "label": status_label,
                                            "color": status_badge_color,
                                            "size": "sm",
                                        },
                                        {
                                            "type": "Badge",
                                            "label": priority_label,
                                            "color": priority_badge_color,
                                            "size": "sm",
                                        },
                                    ],
                                },
                                {"type": "Spacer"},
                                # Action buttons (status-specific)
                                {
                                    "type": "Row",
                                    "gap": 2,
                                    "align": "center",
                                    "children": action_buttons,
                                },
                            ],
                        }
                    ],
                }
            ],
        }
        items.append(item)

    return {
        "type": "ListView",
        "status": {"text": f"Tasks ({len(tasks)})"},
        "children": items,
    }
