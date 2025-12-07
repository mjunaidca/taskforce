"""TaskFlow Agent configuration with MCP integration.

This module provides the agent factory that creates an OpenAI Agents SDK agent
connected to the TaskFlow MCP Server via Streamable HTTP transport.

The agent discovers tools dynamically from the MCP server - no function tools needed.
"""

from agents import Agent
from agents.mcp import MCPServerStreamableHttp

TASKFLOW_SYSTEM_PROMPT = """You are TaskFlow Assistant, an AI helper for task management.

## Authentication Context
- User ID: {user_id}
- Access Token: {access_token}

CRITICAL: When calling ANY MCP tool, you MUST ALWAYS include these parameters:
- user_id: "{user_id}"
- access_token: "{access_token}"

## User Context
- User Name: {user_name}
- Current Project: {project_name} (ID: {project_id})

## Conversation History
{history}

## Your Capabilities
Using the available MCP tools, you can:
- **Add tasks**: Create new tasks in the current project
- **List tasks**: Show all tasks, filter by status (pending, in_progress, completed)
- **Update tasks**: Modify task title, description, status, or assignment
- **Complete tasks**: Mark tasks as done
- **Delete tasks**: Remove tasks from the project
- **Assign tasks**: Assign tasks to team members or agents

## Guidelines
1. Always confirm actions with the user after executing them
2. When listing tasks, format them clearly with ID, title, status, and assignee
3. If a request is ambiguous, ask for clarification
4. If a task is not found, suggest listing tasks to find the correct one
5. Be concise and helpful
6. ALWAYS include user_id="{user_id}" and access_token="{access_token}" in every tool call

## Response Format
- For task lists, use a clear formatted list with key details
- For confirmations, briefly state what was done and the result
- For errors, explain what went wrong and suggest next steps
"""


async def create_taskflow_agent(
    user_name: str,
    project_name: str | None,
    project_id: int | None,
    mcp_server_url: str,
    history: str = "",
) -> tuple[Agent, MCPServerStreamableHttp]:
    """Create a TaskFlow agent with MCP server connection.

    The agent connects to the TaskFlow MCP Server via Streamable HTTP transport
    and discovers available tools dynamically.

    Args:
        user_name: Display name of the current user
        project_name: Name of the current project context (optional)
        project_id: ID of the current project (optional)
        mcp_server_url: URL of the TaskFlow MCP Server (e.g., http://localhost:8001/mcp)
        history: Conversation history string

    Returns:
        Tuple of (agent, mcp_server) - caller must manage the MCP server context.

    Example:
        ```python
        async with MCPServerStreamableHttp(...) as mcp_server:
            agent = Agent(name="TaskFlow Assistant", mcp_servers=[mcp_server])
            result = await Runner.run(agent, "Add a task to buy groceries")
        ```
    """
    mcp_server = MCPServerStreamableHttp(
        name="TaskFlow MCP",
        params={
            "url": mcp_server_url,
            "timeout": 30,
        },
        cache_tools_list=True,
        max_retry_attempts=3,
    )

    # Format the system prompt with user context
    instructions = TASKFLOW_SYSTEM_PROMPT.format(
        user_name=user_name,
        project_name=project_name or "No project selected",
        project_id=project_id or "N/A",
        history=history or "No previous messages",
    )

    agent = Agent(
        name="TaskFlow Assistant",
        instructions=instructions,
        mcp_servers=[mcp_server],  # Tools discovered dynamically from MCP!
    )

    return agent, mcp_server
