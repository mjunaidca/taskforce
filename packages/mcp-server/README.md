# TaskFlow MCP Server

MCP (Model Context Protocol) server that exposes task management tools for AI agents. Part of the TaskFlow platform for human-agent collaboration.

## Features

- **10 MCP Tools** for complete task management
- **Stateless Streamable HTTP** transport (not stdio)
- **No authentication** - receives user_id as parameter (Chat Server validates JWT upstream)
- **Calls existing REST API** - doesn't duplicate database logic

## Quick Start

```bash
# Install dependencies
cd packages/mcp-server
uv sync

# Set environment variables
export TASKFLOW_API_URL=http://localhost:8000
export TASKFLOW_MCP_PORT=8001

# Run the server
uv run python -m taskflow_mcp.server

# Or with uvicorn directly
uv run uvicorn taskflow_mcp.server:streamable_http_app --host 0.0.0.0 --port 8001
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TASKFLOW_API_URL` | `http://localhost:8000` | REST API base URL |
| `TASKFLOW_API_TIMEOUT` | `30.0` | Request timeout in seconds |
| `TASKFLOW_MCP_HOST` | `0.0.0.0` | Server host |
| `TASKFLOW_MCP_PORT` | `8001` | Server port |
| `TASKFLOW_DEV_MODE` | `false` | Enable dev mode (API must also be in dev mode) |
| `TASKFLOW_SERVICE_TOKEN` | `null` | Service token for internal API calls |

## Authentication

The MCP server supports three authentication modes:

1. **Dev Mode** (`TASKFLOW_DEV_MODE=true`):
   - API must also have `DEV_MODE=true`
   - Only `user_id` is required in tool calls
   - Good for local development and testing

2. **Production Mode** (default):
   - Chat Server passes JWT via `access_token` parameter
   - MCP forwards JWT to REST API as `Authorization: Bearer` header

3. **Service Token Mode** (`TASKFLOW_SERVICE_TOKEN=xxx`):
   - For internal service-to-service calls
   - Token used for all API requests

## MCP Tools Reference

### Task Operations

| Tool | Description | Parameters |
|------|-------------|------------|
| `taskflow_add_task` | Create new task | user_id, project_id, title, description? |
| `taskflow_list_tasks` | List project tasks | user_id, project_id, status? |
| `taskflow_update_task` | Update task | user_id, task_id, title?, description? |
| `taskflow_delete_task` | Delete task | user_id, task_id |

### Workflow Operations

| Tool | Description | Parameters |
|------|-------------|------------|
| `taskflow_start_task` | Start working on task | user_id, task_id |
| `taskflow_complete_task` | Mark task complete | user_id, task_id |
| `taskflow_request_review` | Submit for review | user_id, task_id |
| `taskflow_update_progress` | Report progress | user_id, task_id, progress_percent, note? |
| `taskflow_assign_task` | Assign to worker | user_id, task_id, assignee_id |

### Project Operations

| Tool | Description | Parameters |
|------|-------------|------------|
| `taskflow_list_projects` | List user's projects | user_id |

## Testing with MCP Inspector

```bash
# Start the server
uv run python -m taskflow_mcp.server

# In another terminal, run MCP Inspector
npx @modelcontextprotocol/inspector http://localhost:8001/mcp
```

## Development

```bash
# Install dev dependencies
uv sync --all-extras

# Run tests
uv run pytest

# Run linting
uv run ruff check .
uv run ruff format .
```

## Architecture

```
packages/mcp-server/
├── src/taskflow_mcp/
│   ├── app.py           # FastMCP singleton
│   ├── server.py        # Starlette + CORS wrapper
│   ├── config.py        # Environment settings
│   ├── api_client.py    # REST API client
│   ├── models.py        # Pydantic input models
│   └── tools/
│       ├── tasks.py     # 9 task tools
│       └── projects.py  # 1 project tool
└── tests/
```

## Response Format

All tools return JSON responses:

```json
{
  "task_id": 42,
  "status": "created",
  "title": "Task title"
}
```

Error responses:

```json
{
  "error": true,
  "message": "Error description",
  "task_id": 42,
  "status_code": 404
}
```
