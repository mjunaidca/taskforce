"""Projects list widget for ChatKit."""

from typing import Any


def build_projects_widget(projects: list[dict[str, Any]]) -> dict[str, Any]:
    """Build projects list widget.

    Args:
        projects: List of project dictionaries with id, name, description, task_count, member_count

    Returns:
        Widget template dictionary for ChatKit rendering
    """
    if not projects:
        return {
            "type": "ListView",
            "status": {"text": "Projects (0)"},
            "children": [
                {
                    "type": "ListViewItem",
                    "gap": 3,
                    "align": "center",
                    "children": [
                        {
                            "type": "Col",
                            "gap": 1,
                            "children": [
                                {
                                    "type": "Text",
                                    "value": "No projects found",
                                }
                            ],
                        },
                        {"type": "Spacer"},
                        {
                            "type": "Button",
                            "label": "Create Project",
                            "style": "primary",
                            "onClickAction": {
                                "type": "project.create",
                                "handler": "server",
                            },
                        },
                    ],
                }
            ],
        }

    # Build project items
    items = []
    for project in projects:
        project_id = project.get("id")
        name = project.get("name", "Unnamed Project")
        description = project.get("description")
        task_count = project.get("task_count", 0)
        member_count = project.get("member_count", 0)

        # Build children for the project item
        children = [
            {
                "type": "Col",
                "gap": 0,
                "children": [
                    {
                        "type": "Text",
                        "value": name,
                        "size": "sm",
                        "weight": "semibold",
                    }
                ]
                + (
                    [
                        {
                            "type": "Text",
                            "value": description,
                            "size": "sm",
                            "color": "secondary",
                            "maxLines": 1,
                        }
                    ]
                    if description
                    else []
                )
                + [
                    {
                        "type": "Caption",
                        "value": f"{task_count} tasks • {member_count} members",
                        "color": "secondary",
                    }
                ],
            },
            {"type": "Spacer"},
            {
                "type": "Button",
                "label": "View Project",
                "variant": "outline",
                "onClickAction": {
                    "type": "project.view",
                    "handler": "client",
                    "payload": {"project_id": project_id},
                },
            },
        ]

        items.append(
            {
                "type": "ListViewItem",
                "gap": 3,
                "children": children,
            }
        )

    return {
        "type": "ListView",
        "status": {"text": f"Projects ({len(projects)})"},
        "children": items,
    }
