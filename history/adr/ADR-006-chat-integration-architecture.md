# ADR-006: Chat Integration Architecture

- **Status:** Accepted
- **Date:** 2025-12-07
- **Feature:** 005-chatkit-ui, 006-chat-server
- **Context:** specs/005-chatkit-ui/spec.md, specs/006-chat-server/spec.md

## Decision

Implemented a conversational task management interface using OpenAI ChatKit (frontend) and OpenAI Agents SDK (backend), with conversation persistence in a separate PostgreSQL schema. The Chat Server connects to the MCP Server via Streamable HTTP to execute task operations.

**Technology Stack:**
- **Frontend Chat**: @openai/chatkit-react (floating widget)
- **AI Backend**: OpenAI Agents SDK with MCPServerStreamableHttp
- **Persistence**: PostgreSQL with dedicated `taskflow_chat` schema
- **Store Implementation**: Custom PostgresStore implementing ChatKit Store interface
- **MCP Integration**: Agent discovers tools dynamically from MCP Server

**Architecture:**
```
Browser → ChatKit Widget → /api/chat → OpenAI Agents SDK → MCP Server → REST API → DB
                                    ↓
                             PostgresStore (chat history)
```

**Key Design Decisions:**

1. **Separate Chat Database**: `CHATKIT_STORE_DATABASE_URL` distinct from main DB
   - Reason: Chat data has different lifecycle and backup requirements
   - User-based multi-tenancy with row-level isolation

2. **Agent-MCP Dynamic Tool Discovery**: No hardcoded function tools
   - Agent connects to MCP Server and discovers available tools
   - New MCP tools automatically available without Chat Server changes

3. **Context Injection via System Prompt**: User/project context in prompt
   - user_id and access_token injected for MCP tool calls
   - Conversation history included for context continuity

4. **Custom PostgresStore**: Full ChatKit Store interface implementation
   - Threads, items, attachments with user isolation
   - Connection pooling and statement timeouts
   - Schema-based isolation for multi-tenant safety

## Consequences

### Positive
- Natural language interface reduces learning curve for task management
- Dynamic tool discovery enables MCP tool evolution without frontend changes
- Separate chat DB enables independent scaling and backup policies
- User isolation prevents data leakage between tenants
- Conversation persistence enables context continuity across sessions

### Negative
- Additional database adds operational complexity
- Agent → MCP → REST API adds latency to chat responses
- OpenAI API dependency for chat functionality
- Chat history grows unbounded without explicit cleanup policy
- Connection pool must be managed for two databases

## Alternatives Considered

### Alternative A: LangChain for AI orchestration
- Pros: Large ecosystem, many integrations, chain abstraction
- Cons: Complex abstraction layers, version churn, heavier weight
- Why rejected: OpenAI Agents SDK provides simpler, more direct MCP integration

### Alternative B: In-memory chat history (no persistence)
- Pros: Simpler architecture, no additional database
- Cons: History lost on refresh, no cross-session context
- Why rejected: Conversation continuity is essential for good UX

### Alternative C: Same database, different tables for chat
- Pros: Single DB to manage, simpler deployment
- Cons: Chat writes mixed with task CRUD, backup conflicts, schema coupling
- Why rejected: Chat has different access patterns and lifecycle; isolation improves maintainability

### Alternative D: Function tools instead of MCP
- Pros: Simpler setup, no MCP server dependency
- Cons: Duplicates tool definitions, no tool discovery, harder to maintain parity
- Why rejected: MCP provides single source of truth for tools; agents and CLI use same tools

## Implementation Patterns

**Agent Factory with MCP:**
```python
async def create_taskflow_agent(user_name, project_id, mcp_server_url):
    mcp_server = MCPServerStreamableHttp(
        name="TaskFlow MCP",
        params={"url": mcp_server_url, "timeout": 30},
        cache_tools_list=True,
    )
    agent = Agent(
        name="TaskFlow Assistant",
        instructions=SYSTEM_PROMPT.format(user_name=user_name, project_id=project_id),
        mcp_servers=[mcp_server],  # Tools discovered dynamically!
    )
    return agent, mcp_server
```

**PostgresStore Multi-tenancy:**
```python
# All queries include user_id for isolation
SELECT data FROM taskflow_chat.threads
WHERE id = :thread_id AND user_id = :user_id
```

## References
- Spec: specs/005-chatkit-ui/spec.md, specs/006-chat-server/spec.md
- Implementation: packages/api/src/taskflow_api/chatkit_store/, services/chat_agent.py
- Key files: postgres_store.py, chat_agent.py, chatkit_server.py
