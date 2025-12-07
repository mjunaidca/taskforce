# TaskFlow

**Human-Agent Task Orchestration Platform**

> Your AI workforce — assign tasks to humans or agents, track everything, ship together.

---

## What is TaskFlow?

TaskFlow is a task management platform where humans and AI agents collaborate as equals. Both can:
- Be assigned tasks
- Create subtasks
- Delegate work to others
- Report progress
- Request review

Everything is tracked in a complete audit trail.

## Why TaskFlow?

### The Problem

- Work is fragmented across repos, notes, and chat
- When you work with AI agents, there's no unified visibility
- No way to assign work to AI agents like you assign to humans
- No audit trail of who (human or AI) did what

### The Solution

TaskFlow unifies all your work:
- **Personal tasks**: "Message Ahmad about meeting"
- **Project tasks**: "Implement MCP server"
- **Agent tasks**: Assign to @claude-code, @qwen, or @gemini
- **Full audit trail**: Every action tracked

## Features

### Phase 1 (Current): CLI

- ✅ Project management
- ✅ Human and agent worker registration
- ✅ Task CRUD with priorities, tags, due dates
- ✅ Subtask creation and delegation
- ✅ Progress tracking
- ✅ Review workflow (request → approve/reject)
- ✅ Complete audit trail
- ✅ Linked resources
- ✅ Blueprints (reusable task patterns)

### Phase 2: Web Application

- Multi-user with authentication
- Web UI dashboard
- REST API
- Neon PostgreSQL storage

### Phase 3: AI Integration

- MCP Server for agent connections
- Chat interface with natural language
- Agents work autonomously

### Phase 4: Kubernetes

- Docker containerization
- Helm charts
- Local Minikube deployment

### Phase 5: Production

- DigitalOcean Kubernetes
- Kafka event streaming
- Dapr service mesh

## Quick Start

### Prerequisites

- Python 3.13+
- UV package manager

### Installation

```bash
# Clone repository
git clone https://github.com/muhammad/taskflow.git
cd taskflow

# Install CLI
cd cli
uv sync

# Initialize TaskFlow
uv run taskflow init
```

### Basic Usage

```bash
# Create a project
taskflow project add myproject --name "My Project"

# Register yourself
taskflow worker add @me --type human --name "Me"

# Register an AI agent
taskflow agent add @claude-code --capabilities coding,architecture

# Create a task
taskflow add "Build awesome feature" --project myproject --assign @claude-code

# Start the task (creates subtasks)
taskflow start 1

# Update progress
taskflow progress 1 --percent 50 --note "Halfway done"

# Complete
taskflow complete 1

# See audit trail
taskflow audit 1
```

### Human-Agent Workflow

```bash
# 1. Create task for agent
$ taskflow add "Implement auth module" --assign @claude-code --priority high
✓ Created task #1

# 2. Agent starts and breaks down work
$ taskflow start 1
> Research patterns
> Implement backend
> Write tests
✓ Created 3 subtasks

# 3. Agent delegates research to another agent
$ taskflow delegate 1.1 @gemini --note "Need research expertise"
✓ Delegated to @gemini

# 4. Track progress
$ taskflow progress 1 --percent 60 --note "Backend done"

# 5. Request human review
$ taskflow review 1

# 6. Human approves
$ taskflow approve 1
✓ Task #1 completed
```

## Documentation

- [Constitution](specs/constitution.md) - Core principles
- [Phase 1 Overview](specs/phase-1/overview.md) - CLI specification
- [Data Model](specs/phase-1/data-model.md) - All data structures
- [CLI Interface](specs/phase-1/cli-interface.md) - Complete command reference
- [Storage](specs/phase-1/storage.md) - File storage details

## Project Structure

```
taskflow/
├── .spec-kit/           # Spec-Kit configuration
├── specs/               # All specifications
│   ├── constitution.md
│   └── phase-1/
├── cli/                 # Phase 1: CLI application
│   ├── src/taskflow/
│   └── tests/
├── frontend/            # Phase 2+: Next.js app
├── backend/             # Phase 2+: FastAPI server
├── mcp-server/          # Phase 3+: MCP server
├── helm/                # Phase 4+: Kubernetes charts
├── CLAUDE.md            # Claude Code instructions
└── README.md
```

## Development

### Spec-Driven Development

All features are specified before implementation:

1. Write/read spec in `specs/`
2. Use Claude Code to implement
3. Iterate on spec until correct
4. Never write code manually

### Running Tests

```bash
cd cli
uv run pytest
```

### Contributing

1. Read the spec for the feature
2. Implement following CLAUDE.md guidelines
3. Ensure all tests pass
4. Submit PR with spec reference

## Hackathon Submission

This project is Muhammad's submission for **Hackathon II**.

| Phase | Due Date | Status |
|-------|----------|--------|
| Phase 1: CLI | Dec 7, 2025 | 🔄 In Progress |
| Phase 2: Web | Dec 14, 2025 | ⏳ Planned |
| Phase 3: MCP | Dec 21, 2025 | ⏳ Planned |
| Phase 4: K8s | Jan 4, 2026 | ⏳ Planned |
| Phase 5: Cloud | Jan 18, 2026 | ⏳ Planned |

## License

MIT

---

**Built with 🤖 + 👤 collaboration**
