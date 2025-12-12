# Hackathon 2 Retrospective

**Duration**: 5 days (Dec 7-12, 2025)
**Result**: All 5 phases complete + bonus features

---

## What We Built

| Component | Description |
|-----------|-------------|
| **Core Platform** | Multi-tenant project management (Workspaces → Projects → Tasks) |
| **MCP Server** | OAuth 2.0 compliant, same server for UI + CLI agents |
| **Notification System** | Dapr Jobs API for scheduled reminders (not cron polling) |
| **Infrastructure** | AKS + Dapr + Helm + GitHub Actions CD |

## What Worked Well

### 1. Spec-Driven Development
- 19 specifications written BEFORE code
- Specs caught ambiguities early
- Claude Code generated cleaner implementations from clear specs

### 2. Dapr Jobs API over Cron Polling
```
❌ Cron approach: Poll DB every minute, check for due tasks
✅ Our approach: Schedule exact job at due_date, Dapr calls back
```
Result: Exact timing, no polling overhead, cleaner architecture.

### 3. OAuth 2.0 MCP from Day 1
- Built secure agent auth from the start
- Same MCP server serves both UI Agent and Claude Code
- Avoided painful retrofit later

### 4. Vendor-Agnostic Infrastructure
- Neon PostgreSQL (4 DBs)
- Upstash Redis (Dapr PubSub)
- GHCR for container images
- Result: Can migrate AKS → Hetzner with same Helm chart

### 5. Multi-Tenant Architecture from Start
- Workspaces (Orgs) → Projects → Tasks
- Not retrofitted — designed in from Phase 2
- Recursive tasks with infinite depth

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| DB-based audit (not event-sourced) | Simpler for MVP, EDA is v2 |
| Polling over WebSocket | Spec says "polling sufficient for MVP" |
| Same MCP for UI + CLI | True agent parity, single auth flow |
| Dapr PubSub with Redis | Kafka-swappable via config change |

## Trade-offs Made

| Choice | Trade-off | Why Acceptable |
|--------|-----------|----------------|
| No WebSocket | 30s polling delay | MVP scope, documented in spec |
| No event sourcing | No replay capability | DB audit is fully functional |
| Direct HTTP between services | No mTLS/retries | Works for current scale |

## Learning Backlog (v2)

Captured in GitHub Issues:

- [#31](https://github.com/mjunaidca/taskforce/issues/31) - Real-time WebSocket Sync
- [#32](https://github.com/mjunaidca/taskforce/issues/32) - Event-Sourced Audit Trail
- [#33](https://github.com/mjunaidca/taskforce/issues/33) - Dapr State Management
- [#34](https://github.com/mjunaidca/taskforce/issues/34) - Dapr Service Invocation

## Time Breakdown

| Day | Focus |
|-----|-------|
| Day 0 (Dec 6) | Specs & planning (md files only) |
| Day 1-2 | Phase 1-2: CLI + Web app |
| Day 3 | Phase 3: MCP + ChatKit |
| Day 4-5 | Phase 4-5: K8s + Cloud deployment |

## Metrics

- **Specs**: 19 specifications
- **Tests**: 250+ CI tests
- **Services**: 5 microservices + 2 Dapr sidecars
- **Databases**: 4 Neon PostgreSQL instances
- **Bonus Points**: Voice input (+200), Reusable Intelligence (+200)

## Key Learnings

1. **Spec-first saves time** — Ambiguities caught in markdown, not in debugging
2. **Dapr abstracts well** — Redis → Kafka is config change, not code change
3. **OAuth from start** — Security retrofits are painful; design it in
4. **Multi-tenant from start** — Same principle; hard to add later
5. **Vendor-agnostic pays off** — Cloud portability with zero code changes

---

*Built with Spec-Driven Development + Claude Code*
