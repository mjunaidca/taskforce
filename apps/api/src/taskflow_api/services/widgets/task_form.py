"""Task form and confirmation widgets for ChatKit."""

from typing import Any


def build_task_created_confirmation(
    task_id: int,
    title: str,
    project_name: str | None = None,
) -> dict[str, Any]:
    """Build task creation confirmation widget.

    Args:
        task_id: ID of the created task
        title: Title of the created task
        project_name: Optional project name

    Returns:
        Widget template dictionary for ChatKit rendering
    """
    children = [
        {
            "type": "Box",
            "background": "green-500",
            "radius": "full",
            "padding": 3,
            "children": [
                {
                    "type": "Icon",
                    "name": "check",
                    "size": "3xl",
                    "color": "white",
                }
            ],
        },
        {
            "type": "Title",
            "value": "Task Created Successfully",
            "color": "success",
            "textAlign": "center",
        },
        {
            "type": "Text",
            "value": f"Task #{task_id}: {title}",
            "size": "sm",
            "textAlign": "center",
        },
    ]

    # Add project name if provided
    if project_name:
        children.append(
            {
                "type": "Caption",
                "value": f"in {project_name}",
                "color": "success",
                "textAlign": "center",
            }
        )

    # Add button
    children.append(
        {
            "type": "Button",
            "label": "View Task",
            "style": "primary",
            "color": "success",
            "onClickAction": {
                "type": "task.view",
                "handler": "client",
                "payload": {"task_id": task_id},
            },
        }
    )

    return {
        "type": "Card",
        "size": "sm",
        "children": [
            {
                "type": "Col",
                "align": "center",
                "gap": 4,
                "padding": {"top": 5, "bottom": 4},
                "children": children,
            }
        ],
    }


def build_task_form_widget(
    project_id: int | None = None,
    members: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Build task creation form widget.

    Args:
        project_id: Optional project ID to associate task with
        members: Optional list of members for assignee dropdown

    Returns:
        Widget template dictionary for ChatKit rendering
    """
    # Priority options
    priority_options = [
        {"value": "low", "label": "Low"},
        {"value": "medium", "label": "Medium"},
        {"value": "high", "label": "High"},
        {"value": "urgent", "label": "Urgent"},
    ]
    default_priority = "medium"

    # Recurrence pattern options
    recurrence_options = [
        {"value": "", "label": "Not recurring"},
        {"value": "1m", "label": "Every minute"},
        {"value": "5m", "label": "Every 5 minutes"},
        {"value": "10m", "label": "Every 10 minutes"},
        {"value": "15m", "label": "Every 15 minutes"},
        {"value": "30m", "label": "Every 30 minutes"},
        {"value": "1h", "label": "Every hour"},
        {"value": "daily", "label": "Daily"},
        {"value": "weekly", "label": "Weekly"},
        {"value": "monthly", "label": "Monthly"},
    ]

    # Assignee options
    assignee_options = [{"value": None, "label": "Unassigned"}]
    if members:
        for member in members:
            assignee_options.append(
                {
                    "value": member.get("id"),
                    "label": member.get("name", "Unknown"),
                }
            )
    default_assignee = None

    return {
        "type": "Card",
        "size": "md",
        "children": [
            {
                "type": "Form",
                "onSubmitAction": {
                    "type": "task.create",
                    "handler": "server",
                    "payload": {"project_id": project_id},
                },
                "children": [
                    {
                        "type": "Col",
                        "gap": 3,
                        "children": [
                            {
                                "type": "Title",
                                "value": "Create New Task",
                                "size": "md",
                            },
                            # Title field
                            {
                                "type": "Col",
                                "gap": 1,
                                "children": [
                                    {
                                        "type": "Label",
                                        "value": "Title",
                                        "fieldName": "task.title",
                                    },
                                    {
                                        "type": "Input",
                                        "name": "task.title",
                                        "required": True,
                                        "placeholder": "Enter task title...",
                                    },
                                ],
                            },
                            # Description field
                            {
                                "type": "Col",
                                "gap": 1,
                                "children": [
                                    {
                                        "type": "Label",
                                        "value": "Description",
                                        "fieldName": "task.description",
                                    },
                                    {
                                        "type": "Textarea",
                                        "name": "task.description",
                                        "placeholder": "Enter task description...",
                                        "rows": 4,
                                        "autoResize": True,
                                    },
                                ],
                            },
                            # Priority and Assignee row
                            {
                                "type": "Row",
                                "gap": 3,
                                "children": [
                                    {
                                        "type": "Col",
                                        "flex": 1,
                                        "gap": 1,
                                        "children": [
                                            {
                                                "type": "Label",
                                                "value": "Priority",
                                                "fieldName": "task.priority",
                                            },
                                            {
                                                "type": "Select",
                                                "name": "task.priority",
                                                "options": priority_options,
                                                "defaultValue": default_priority,
                                            },
                                        ],
                                    },
                                    {
                                        "type": "Col",
                                        "flex": 1,
                                        "gap": 1,
                                        "children": [
                                            {
                                                "type": "Label",
                                                "value": "Assign to",
                                                "fieldName": "task.assigneeId",
                                            },
                                            {
                                                "type": "Select",
                                                "name": "task.assigneeId",
                                                "options": assignee_options,
                                                "defaultValue": default_assignee,
                                            },
                                        ],
                                    },
                                ],
                            },
                            # Due Date field
                            {
                                "type": "Col",
                                "gap": 1,
                                "children": [
                                    {
                                        "type": "Label",
                                        "value": "Due Date (Optional)",
                                        "fieldName": "task.dueDate",
                                    },
                                    {
                                        "type": "Input",
                                        "name": "task.dueDate",
                                        "placeholder": "YYYY-MM-DD",
                                    },
                                ],
                            },
                            # Recurring task section
                            {
                                "type": "Row",
                                "gap": 3,
                                "children": [
                                    {
                                        "type": "Col",
                                        "flex": 1,
                                        "gap": 1,
                                        "children": [
                                            {
                                                "type": "Label",
                                                "value": "Repeat",
                                                "fieldName": "task.recurrencePattern",
                                            },
                                            {
                                                "type": "Select",
                                                "name": "task.recurrencePattern",
                                                "options": recurrence_options,
                                                "defaultValue": "",
                                            },
                                        ],
                                    },
                                    {
                                        "type": "Col",
                                        "flex": 1,
                                        "gap": 1,
                                        "children": [
                                            {
                                                "type": "Label",
                                                "value": "Max Repeats",
                                                "fieldName": "task.maxOccurrences",
                                            },
                                            {
                                                "type": "Input",
                                                "name": "task.maxOccurrences",
                                                "placeholder": "Unlimited",
                                            },
                                        ],
                                    },
                                ],
                            },
                            {"type": "Divider"},
                            # Actions row
                            {
                                "type": "Row",
                                "children": [
                                    {
                                        "type": "Button",
                                        "label": "Cancel",
                                        "variant": "outline",
                                        "onClickAction": {
                                            "type": "form.cancel",
                                            "handler": "client",
                                        },
                                    },
                                    {"type": "Spacer"},
                                    {
                                        "type": "Button",
                                        "submit": True,
                                        "label": "Create Task",
                                        "style": "primary",
                                    },
                                ],
                            },
                        ],
                    }
                ],
            }
        ],
    }
