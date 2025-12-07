# ADR Generation Complete

## Summary

| Phase | ADRs Created | Key Decisions |
|-------|--------------|---------------|
| 001-cli-core | 1 | CLI Framework (Typer + Pydantic + JSON) |
| 002-sso-platform | 1 | SSO Architecture (Better Auth + OAuth 2.1 PKCE) |
| 003-backend-api | 1 | API Framework (FastAPI + SQLModel + Neon) |
| 004-web-dashboard | 1 | Frontend Stack (Next.js 15 + shadcn/ui) |
| 005-mcp-server | 1 | MCP Protocol (FastMCP + HTTP transport) |
| 005-chatkit-ui + 006-chat-server | 1 | Chat Architecture (ChatKit + Agents SDK + PostgresStore) |
| Cross-cutting | 3 | Human-Agent Parity, Recursive Tasks, Audit Trail |

**Total: 9 ADRs**

---

## Created ADRs

### ADR-001: CLI Framework and Data Architecture
- **Path:** history/adr/ADR-001-cli-framework-and-data-architecture.md
- **Phase:** 001-cli-core
- **Summary:** Typer + Pydantic + JSON file storage with Rich output for rapid prototyping

### ADR-002: SSO Platform Authentication Architecture
- **Path:** history/adr/ADR-002-sso-platform-authentication-architecture.md
- **Phase:** 002-sso-platform
- **Summary:** Better Auth with OAuth 2.1 PKCE, RS256 JWKS, custom JWT claims for multi-tenancy

### ADR-003: Backend API Framework and Database Strategy
- **Path:** history/adr/ADR-003-backend-api-framework-and-database-strategy.md
- **Phase:** 003-backend-api
- **Summary:** FastAPI + SQLModel + asyncpg on Neon PostgreSQL with JWKS-cached auth

### ADR-004: Web Dashboard Frontend Stack
- **Path:** history/adr/ADR-004-web-dashboard-frontend-stack.md
- **Phase:** 004-web-dashboard
- **Summary:** Next.js 15 App Router + shadcn/ui + OAuth PKCE with unified worker display

### ADR-005: MCP Server Protocol and Communication
- **Path:** history/adr/ADR-005-mcp-server-protocol-and-communication.md
- **Phase:** 005-mcp-server
- **Summary:** FastMCP with Stateless HTTP transport, REST API as single source of truth

### ADR-006: Chat Integration Architecture
- **Path:** history/adr/ADR-006-chat-integration-architecture.md
- **Phase:** 005-chatkit-ui, 006-chat-server
- **Summary:** ChatKit + OpenAI Agents SDK + PostgresStore with dynamic MCP tool discovery

### ADR-007: Human-Agent Parity Model
- **Path:** history/adr/ADR-007-human-agent-parity-model.md
- **Phase:** Cross-cutting
- **Summary:** Unified Worker model where humans and agents are first-class citizens

### ADR-008: Recursive Task Decomposition
- **Path:** history/adr/ADR-008-recursive-task-decomposition.md
- **Phase:** Cross-cutting
- **Summary:** Self-referential parent_task_id enabling unlimited subtask depth

### ADR-009: Audit Trail Architecture
- **Path:** history/adr/ADR-009-audit-trail-architecture.md
- **Phase:** Cross-cutting
- **Summary:** Immutable audit logging as product feature with actor attribution

---

## Decisions NOT Documented as ADRs

These decisions were considered but did not pass the significance test (impact + alternatives + cross-cutting):

| Phase | Decision | Why Not ADR |
|-------|----------|-------------|
| 001 | Use UV package manager | Single tool choice, no architectural impact |
| 001 | Sequential integer IDs | Implementation detail, could change without impact |
| 002 | Drizzle ORM | Part of Better Auth stack, not independent decision |
| 003 | Connection pool settings | Configuration tuning, not architectural |
| 004 | IFK theme choice | Visual design, not architectural |
| 005 | httpx over aiohttp | Library preference, similar capabilities |
| 006 | 20-message history limit | Configuration, not architecture |

---

## Constitutional Principles Alignment

| Principle | ADRs Implementing It |
|-----------|---------------------|
| **1. Every Action Must Be Auditable** | ADR-009 |
| **2. Agents Are First-Class Citizens** | ADR-007 |
| **3. Recursive Task Decomposition** | ADR-008 |
| **4. Spec-Driven Development** | (Process, not architecture) |

---

## Navigation

- [ADR-001: CLI Framework](./ADR-001-cli-framework-and-data-architecture.md)
- [ADR-002: SSO Platform](./ADR-002-sso-platform-authentication-architecture.md)
- [ADR-003: Backend API](./ADR-003-backend-api-framework-and-database-strategy.md)
- [ADR-004: Web Dashboard](./ADR-004-web-dashboard-frontend-stack.md)
- [ADR-005: MCP Server](./ADR-005-mcp-server-protocol-and-communication.md)
- [ADR-006: Chat Integration](./ADR-006-chat-integration-architecture.md)
- [ADR-007: Human-Agent Parity](./ADR-007-human-agent-parity-model.md)
- [ADR-008: Recursive Tasks](./ADR-008-recursive-task-decomposition.md)
- [ADR-009: Audit Trail](./ADR-009-audit-trail-architecture.md)
