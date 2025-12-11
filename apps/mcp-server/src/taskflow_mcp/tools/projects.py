"""Project MCP tools.

Implements project discovery tool:
- taskflow_list_projects: List user's projects

Authentication (014-mcp-oauth-standardization):
- User context is obtained from middleware via get_current_user()
- No auth params in tool signatures
"""

import json

from mcp.server.fastmcp.server import Context

from ..api_client import APIError, get_api_client
from ..app import mcp
from ..auth import get_current_user
from ..models import ListProjectsInput


@mcp.tool(
    name="taskflow_list_projects",
    annotations={
        "title": "List Projects",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def taskflow_list_projects(params: ListProjectsInput, ctx: Context) -> str:
    """List projects the user belongs to.

    Args:
        params: ListProjectsInput (no parameters needed)

    Returns:
        JSON array of projects with id, name, slug, task_count, member_count

    Example:
        Input: {}
        Output: [{"id": 1, "name": "My Project", "slug": "my-project", ...}, ...]
    """
    try:
        user = get_current_user()
        client = get_api_client()
        projects = await client.list_projects(
            user_id=user.id,
            access_token=user.token,
        )
        # Return simplified project list
        result = [
            {
                "id": p.get("id"),
                "name": p.get("name"),
                "slug": p.get("slug"),
                "description": p.get("description"),
                "task_count": p.get("task_count", 0),
                "member_count": p.get("member_count", 0),
            }
            for p in projects
        ]
        return json.dumps(result, indent=2)
    except APIError as e:
        return json.dumps(
            {
                "error": True,
                "message": e.detail or e.message,
                "status_code": e.status_code,
            },
            indent=2,
        )
    except Exception as e:
        return json.dumps({"error": True, "message": str(e)})
