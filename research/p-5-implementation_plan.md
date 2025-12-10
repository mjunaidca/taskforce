# Phase V Implementation Plan (Parallel Execution)

> **Strategy**: Deploy first → Parallel feature work → Redeploy → Polish

---

## Requirements Checklist

### Phase V Part A: Features
| Requirement | Status | Owner |
|-------------|--------|-------|
| Recurring Tasks | ⏳ | Agent 2 |
| Due Dates & Reminders | ⏳ | Agent 1 + 2 |
| Priorities | ⏳ | Agent 1 |
| Tags/Categories | ⏳ | Agent 1 |
| Search & Filter | ⏳ | Agent 1 |
| Sort Tasks | ⏳ | Agent 1 |
| Kafka/Event-driven | ⏳ | Agent 2 |
| Dapr integration | ⏳ | Agent 2 |

### Phase V Part B: Local (Minikube)
| Requirement | Status | Owner |
|-------------|--------|-------|
| Dapr Pub/Sub | ⏳ | Agent 2 |
| Dapr State | ⏳ | Agent 2 |
| Dapr Bindings (cron) | ⏳ | Agent 2 |
| Dapr Secrets | ✅ | Already using K8s secrets |
| Dapr Service Invocation | ⏳ | Agent 2 |

### Phase V Part C: Cloud
| Requirement | Status | Owner |
|-------------|--------|-------|
| Deploy to DOKS | ⏳ | Phase 1 |
| Dapr on DOKS | ⏳ | Phase 3 |
| Redpanda/Kafka | ⏳ | Agent 2 |
| GitHub Actions CI/CD | ⏳ | Agent 3 |
| Monitoring & Logging | ⏳ | Agent 4 |

### Deliverables
| Requirement | Status | Owner |
|-------------|--------|-------|
| Demo Video (90 sec) | ⏳ | Phase 4 |
| README update | ⏳ | Agent 4 |
| Form submission | ⏳ | Final |

---

## Execution Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Deploy As-Is (20 min)                                      │
│   • Commit Phase IV                                                 │
│   • Deploy to DOKS                                                  │
│   • Verify baseline works                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ AGENT 1           │ │ AGENT 2           │ │ AGENT 3           │ │ AGENT 4           │
│ Feature Fields    │ │ Dapr + Events     │ │ CI/CD             │ │ Docs + Monitor    │
│ (45 min)          │ │ (90 min)          │ │ (30 min)          │ │ (30 min)          │
│                   │ │                   │ │                   │ │                   │
│ • priority enum   │ │ • Redis pub/sub   │ │ • GitHub Actions  │ │ • README update   │
│ • due_date field  │ │ • Dapr sidecars   │ │ • Build workflow  │ │ • Dapr dashboard  │
│ • tags JSON       │ │ • Event publish   │ │ • Push to GHCR    │ │ • Basic logging   │
│ • search param    │ │ • Cron binding    │ │                   │ │                   │
│ • filter params   │ │ • Recurring tasks │ │                   │ │                   │
│ • sort param      │ │ • Reminder events │ │                   │ │                   │
│                   │ │ • Notification    │ │                   │ │                   │
│                   │ │   service stub    │ │                   │ │                   │
└─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
          └───────────────────┬─┴───────────────────┬─┴───────────────────┬─┘
                              ↓                                           
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Merge + Redeploy (30 min)                                  │
│   • Merge all agent work                                            │
│   • Redeploy to DOKS with Dapr                                      │
│   • Attach domain (optional)                                        │
│   • Verify everything works                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Demo + Submit (45 min)                                     │
│   • Record 90-second demo video                                     │
│   • Submit via Google Form                                          │
│   • Delete DOKS cluster (save costs)                               │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Quality (Post-Demo, 1-2 hrs)                               │
│   • N+1 query fix (#14)                                             │
│   • Duplicate tasks fix (#13)                                       │
│   • MCP/Agent improvements                                          │
│   • SSO social login testing                                        │
│   • UI review                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Agent Assignments

### Agent 1: Feature Fields (API)
**Files:**
- [packages/api/src/taskflow_api/models/task.py](file:///Users/mjs/Documents/code/mjunaidca/tf-k8/packages/api/src/taskflow_api/models/task.py)
- [packages/api/src/taskflow_api/schemas/task.py](file:///Users/mjs/Documents/code/mjunaidca/tf-k8/packages/api/src/taskflow_api/schemas/task.py)
- [packages/api/src/taskflow_api/routers/tasks.py](file:///Users/mjs/Documents/code/mjunaidca/tf-k8/packages/api/src/taskflow_api/routers/tasks.py)

**Deliverables:**
```python
# Task model additions:
priority: Priority = Field(default="medium", index=True)
due_date: datetime | None = Field(default=None, index=True)
tags: list[str] = Field(default=[], sa_type=JSON)
is_recurring: bool = Field(default=False)
recurrence_pattern: str | None = Field(default=None)  # cron expression

# Endpoint additions:
GET /tasks?priority=high&has_due_date=true&sort_by=due_date&search=keyword
```

---

### Agent 2: Dapr + Events
**Files:**
- `helm/taskflow/templates/dapr/` (new directory)
- `packages/api/src/taskflow_api/services/events.py` (new)
- `packages/notification-service/` (new, minimal)

**Deliverables:**
```yaml
# Dapr components:
- pubsub.redis (or pubsub.kafka with Redpanda)
- bindings.cron (for recurring task checks)
- state.redis (for caching)

# Event types:
- task.created
- task.updated
- task.completed
- task.deleted
- reminder.scheduled
```

---

### Agent 3: CI/CD
**Files:**
- `.github/workflows/build.yml`
- `.github/workflows/deploy.yml`

**Deliverables:**
```yaml
# On push to main:
- Build Docker images
- Push to GHCR
- (Optional) Deploy to DOKS
```

---

### Agent 4: Docs + Monitoring
**Files:**
- [README.md](file:///Users/mjs/Documents/code/mjunaidca/tf-k8/README.md)
- `helm/taskflow/templates/monitoring/` (optional)

**Deliverables:**
- README with Phase V instructions
- Dapr dashboard enabled
- Basic logging visible in kubectl

---

## Time Summary

| Phase | Time | Parallel? |
|-------|------|-----------|
| Phase 1: Deploy As-Is | 20 min | No |
| Agent 1-4 Work | 90 min | **Yes (4 parallel)** |
| Phase 3: Merge + Redeploy | 30 min | No |
| Phase 4: Demo + Submit | 45 min | No |
| Phase 5: Quality | 1-2 hr | Parallel OK |
| **Total** | **~4-5 hrs** | |

---

## Verification Checklist

### After Phase 1 (Deploy As-Is)
- [ ] All 6 pods running on DOKS
- [ ] Web dashboard accessible
- [ ] API responds to health check

### After Agent Work
- [ ] Agent 1: `GET /tasks?priority=high` returns filtered results
- [ ] Agent 2: Dapr dashboard shows pubsub component
- [ ] Agent 3: GitHub Actions workflow visible
- [ ] Agent 4: README has Phase V section

### After Phase 3 (Redeploy)
- [ ] Dapr sidecars running (`kubectl get pods` shows 2/2)
- [ ] Task create publishes event (check Dapr logs)
- [ ] Domain attached (if applicable)

### After Phase 4 (Demo)
- [ ] 90-second video recorded
- [ ] Form submitted
- [ ] DOKS cluster deleted

---

## Missing Nothing Checklist

| Hackathon Requirement | Covered? | Where |
|----------------------|----------|-------|
| Recurring Tasks | ✅ | Agent 2 + cron binding |
| Due Dates | ✅ | Agent 1 |
| Reminders | ✅ | Agent 2 + events |
| Priorities | ✅ | Agent 1 |
| Tags | ✅ | Agent 1 |
| Search | ✅ | Agent 1 |
| Filter | ✅ | Agent 1 |
| Sort | ✅ | Agent 1 |
| Kafka/EDA | ✅ | Agent 2 + Redpanda |
| Dapr Pub/Sub | ✅ | Agent 2 |
| Dapr State | ✅ | Agent 2 |
| Dapr Bindings | ✅ | Agent 2 |
| Dapr Secrets | ✅ | Already done (K8s) |
| DOKS Deploy | ✅ | Phase 1 + 3 |
| GitHub Actions | ✅ | Agent 3 |
| Monitoring | ✅ | Agent 4 |
| Demo Video | ✅ | Phase 4 |
