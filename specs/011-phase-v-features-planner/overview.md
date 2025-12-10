# Phase V: Advanced Features & Cloud Deployment

**Due Date**: January 18, 2026  
**Points**: 300 + Bonus

---

## Overview

Phase V implements **Intermediate** and **Advanced** level features, then deploys to production-grade Kubernetes (DOKS) with Dapr and Kafka/Redpanda.

---

## Agent Assignments

| Agent | Domain | Time | Spec |
|-------|--------|------|------|
| **Agent 1** | Feature Fields (Search/Filter/Sort) + N+1 Fix | 45-60 min | [PRD](./agent-1-feature-fields-prd.md), [Instructions](./AGENT-1-INSTRUCTIONS.md) |
| **Agent 2A** | Recurring Tasks (model + logic + UI) | 45 min | [PRD](./agent-2a-recurring-tasks-prd.md) |
| **Agent 2B** | Notifications & Dapr (events + service + bell) | 60 min | [PRD](./agent-2b-notifications-dapr-prd.md) |
| **Agent 3** | CI/CD (GitHub Actions) | 30 min | TBD |
| **Agent 4** | Docs + Monitoring | 30 min | TBD |
| **Agent 5** | MCP OAuth Standardization | 90-120 min | [PRD](../014-mcp-oauth-standardization/prd.md), [Instructions](../014-mcp-oauth-standardization/AGENT-INSTRUCTIONS.md) |

---

## Requirements Mapping

### Intermediate Level (Agent 1)
| Feature | Status | Owner |
|---------|--------|-------|
| Priorities | ✅ Exists | Model ready |
| Tags/Categories | ✅ Exists | Model ready |
| Search | ⏳ Pending | Agent 1 |
| Filter | ⏳ Pending | Agent 1 |
| Sort | ⏳ Pending | Agent 1 |

### Advanced Level (Agent 2)
| Feature | Status | Owner |
|---------|--------|-------|
| Recurring Tasks | ⏳ Pending | Agent 2 |
| Due Dates | ✅ Exists | Model ready |
| Reminders | ⏳ Pending | Agent 2 |

### Infrastructure (Agent 2-5)
| Feature | Status | Owner |
|---------|--------|-------|
| Dapr Pub/Sub | ⏳ Pending | Agent 2B |
| Dapr State | ⏳ Pending | Agent 2B |
| Dapr Bindings (cron) | ⏳ Pending | Agent 2B |
| Kafka/Redpanda | ⏳ Pending | Agent 2B |
| GitHub Actions CI/CD | ⏳ Pending | Agent 3 |
| Monitoring/Logging | ⏳ Pending | Agent 4 |
| README Update | ⏳ Pending | Agent 4 |
| **MCP OAuth/Device Flow** | ⏳ Pending | Agent 5 |
| **MCP Standard Auth** | ⏳ Pending | Agent 5 |
| **CLI Agent Support** | ⏳ Pending | Agent 5 |

---

## Critical Bugs to Fix

| Issue | Priority | Owner | Description |
|-------|----------|-------|-------------|
| [#14](https://github.com/mjunaidca/taskforce/issues/14) | CRITICAL | Agent 1 | N+1 query in list_tasks |
| [#13](https://github.com/mjunaidca/taskforce/issues/13) | HIGH | Post-Demo | Duplicate tasks |

---

## Execution Order

```
1. Agent Work (Parallel) ─────────────────────────────────────────
   ├── Agent 1: Feature Fields + N+1 Fix (45 min) ✅ DONE
   ├── Agent 2A: Recurring Tasks (45 min) ✅ DONE
   ├── Agent 2B: Dapr + Events (60 min) 🟡 IN PROGRESS
   ├── Agent 3: CI/CD (30 min) ⏳ Can Start
   ├── Agent 4: Docs + Monitoring (30 min) ⏳ Can Start
   └── Agent 5: MCP OAuth (90-120 min) ⏳ Can Start (No Dependencies)

2. Integration (30 min) ──────────────────────────────────────────
   └── Merge all branches, resolve conflicts

3. Deploy to DOKS (30 min) ───────────────────────────────────────
   └── Helm upgrade with Dapr sidecars

4. Demo + Submit (45 min) ────────────────────────────────────────
   ├── Record 90-second video
   └── Submit Google Form
```

---

## Files by Owner

### Agent 1 (Feature Fields)
```
packages/api/src/taskflow_api/routers/tasks.py     # N+1 fix, search/filter/sort
web-dashboard/src/types/index.ts                   # TaskFilterParams
web-dashboard/src/lib/api.ts                       # API client params
web-dashboard/src/app/tasks/page.tsx               # UI filters
packages/mcp-server/src/taskflow_mcp/tools/tasks.py # MCP tool params
packages/mcp-server/src/taskflow_mcp/api_client.py  # API client
```

### Agent 2 (Dapr + Events)
```
helm/taskflow/templates/dapr/                      # New directory
packages/api/src/taskflow_api/services/events.py   # New file
packages/api/src/taskflow_api/models/task.py       # is_recurring, recurrence_pattern
packages/notification-service/                     # New package (minimal)
```

### Agent 3 (CI/CD)
```
.github/workflows/build.yml                        # Docker build
.github/workflows/deploy.yml                       # DOKS deploy
```

### Agent 4 (Docs + Monitoring)
```
README.md                                          # Phase V section
helm/taskflow/templates/monitoring/                # Optional
```

### Agent 5 (MCP OAuth)
```
sso-platform/src/lib/auth.ts                       # Device Flow plugin
sso-platform/src/lib/trusted-clients.ts            # MCP client registration
sso-platform/src/app/auth/device/page.tsx          # Device approval UI
packages/mcp-server/src/taskflow_mcp/auth.py       # JWT/API key validation
packages/mcp-server/src/taskflow_mcp/server.py     # Auth middleware
packages/mcp-server/src/taskflow_mcp/config.py     # SSO URL config
packages/mcp-server/src/taskflow_mcp/tools/*.py    # Simplified tool signatures
packages/mcp-server/src/taskflow_mcp/models.py     # Remove auth params
```

---

## Non-Goals (Out of Scope)

- Full-text search with PostgreSQL tsvector
- Real-time WebSocket updates
- Voice commands
- Multi-language support
- Mobile app

---

## Success Metrics

| Metric | Target | How to Verify |
|--------|--------|---------------|
| N+1 Fix | 2 queries max | SQL logging |
| Search latency | < 100ms | curl timing |
| Filter accuracy | 100% | Test cases |
| Sort correctness | Priority order correct | Manual test |
| Dapr sidecars | All pods 2/2 ready | `kubectl get pods` |
| MCP OAuth | Claude Code connects | Manual test |
| Device Flow | Code → Approval → Token | E2E test |
| Demo video | < 90 seconds | Video length |

