# Dapr Agent Orchestration Architecture

**Status**: Draft
**Created**: 2025-12-15
**Depends On**: [AGENT-CLOUD-EXECUTION.md](./AGENT-CLOUD-EXECUTION.md)

---

## Overview

This document details how Dapr building blocks are used to orchestrate autonomous AI agents in TaskFlow. Dapr provides the distributed systems primitives (pub/sub, state, actors, secrets) that enable reliable agent execution at scale.

---

## 1. Dapr Building Blocks Used

| Building Block | Purpose in Agent Orchestration |
|----------------|-------------------------------|
| **Pub/Sub** | Event-driven task lifecycle, agent coordination |
| **State Management** | Agent checkpoints, execution context |
| **Actors** | Agent lifecycle management, single-threaded execution |
| **Secrets** | Provider credentials injection |
| **Service Invocation** | Synchronous agent-to-service calls |
| **Bindings** | External system integration (GitHub, Slack) |

---

## 2. Event Flow Architecture

### 2.1 Complete Event Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TASK LIFECYCLE EVENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [User/API]                                                                  │
│      │                                                                       │
│      │ POST /tasks/{id}/assign                                               │
│      ▼                                                                       │
│  ┌────────────┐                                                              │
│  │ task.      │──────────────────────────────────────────────┐               │
│  │ assigned   │                                              │               │
│  └────────────┘                                              │               │
│        │                                                     │               │
│        │ (agent assignment)                                  │ (human)       │
│        ▼                                                     ▼               │
│  ┌─────────────────┐                                   ┌──────────┐          │
│  │ Agent Scheduler │                                   │ Ignored  │          │
│  │ Service         │                                   └──────────┘          │
│  └────────┬────────┘                                                         │
│           │                                                                  │
│           │ spawn container                                                  │
│           ▼                                                                  │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐                       │
│  │ agent.     │────▶│ agent.     │────▶│ agent.     │                       │
│  │ spawned    │     │ started    │     │ progress   │◀──┐                   │
│  └────────────┘     └────────────┘     └─────┬──────┘   │                   │
│                                              │          │ (loop)            │
│                                              │          │                   │
│                           ┌──────────────────┼──────────┘                   │
│                           │                  │                              │
│                           │    ┌─────────────┴─────────────┐                │
│                           │    │                           │                │
│                           │    ▼                           ▼                │
│                           │ ┌────────────┐           ┌────────────┐         │
│                           │ │ agent.     │           │ agent.     │         │
│                           │ │ subtask.   │           │ tool.      │         │
│                           │ │ created    │           │ called     │         │
│                           │ └─────┬──────┘           └────────────┘         │
│                           │       │                                         │
│                           │       │ (recursive)                             │
│                           │       ▼                                         │
│                           │  ┌────────────┐                                 │
│                           │  │ task.      │ (new task for subtask)          │
│                           │  │ assigned   │                                 │
│                           │  └────────────┘                                 │
│                           │                                                 │
│           ┌───────────────┴───────────────┐                                 │
│           │                               │                                 │
│           ▼                               ▼                                 │
│  ┌────────────┐                   ┌────────────┐                            │
│  │ agent.     │                   │ agent.     │                            │
│  │ completed  │                   │ failed     │                            │
│  └─────┬──────┘                   └─────┬──────┘                            │
│        │                                │                                   │
│        │                    ┌───────────┴───────────┐                       │
│        │                    │                       │                       │
│        │                    ▼                       ▼                       │
│        │           ┌────────────┐           ┌────────────┐                  │
│        │           │ agent.     │           │ agent.     │                  │
│        │           │ retry      │           │ escalated  │                  │
│        │           └────────────┘           └────────────┘                  │
│        │                                                                    │
│        │  (if review_only mode)                                             │
│        ▼                                                                    │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐                       │
│  │ review.    │────▶│ review.    │────▶│ task.      │                       │
│  │ requested  │     │ completed  │     │ completed  │                       │
│  └────────────┘     └────────────┘     └────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Event Schemas

```python
# Base event schema
class TaskFlowEvent(BaseModel):
    """Base class for all TaskFlow events"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    type: str                           # Event type
    source: str                         # Service that emitted event
    subject: str                        # Resource identifier (e.g., task/123)
    time: datetime = Field(default_factory=datetime.utcnow)
    datacontenttype: str = "application/json"
    correlation_id: str                 # Links related events
    data: dict                          # Event-specific payload

# Event type definitions
EVENTS = {
    # Task lifecycle
    "task.assigned": {
        "data": {
            "task_id": int,
            "assigned_to": str,        # @human:name or @agent:type
            "assigned_by": str,
            "execution_mode": str,     # yolo, supervised, review_only
            "provider": Optional[str], # AI provider if agent
        }
    },

    # Agent lifecycle
    "agent.spawned": {
        "data": {
            "task_id": int,
            "agent_id": str,
            "container_id": str,
            "provider": str,
            "trust_level": str,
        }
    },

    "agent.started": {
        "data": {
            "task_id": int,
            "agent_id": str,
            "started_at": datetime,
        }
    },

    "agent.progress": {
        "data": {
            "task_id": int,
            "agent_id": str,
            "progress_percent": int,   # 0-100
            "message": str,
            "tokens_used": int,
            "cost_incurred": Decimal,
            "action_count": int,
        }
    },

    "agent.subtask.created": {
        "data": {
            "parent_task_id": int,
            "subtask_id": int,
            "title": str,
            "assigned_to": str,        # Can be another agent
            "reason": str,
        }
    },

    "agent.tool.called": {
        "data": {
            "task_id": int,
            "agent_id": str,
            "tool_name": str,
            "tool_args": dict,
            "result_status": str,      # success, error
            "duration_ms": int,
        }
    },

    "agent.completed": {
        "data": {
            "task_id": int,
            "agent_id": str,
            "result": dict,
            "total_tokens": int,
            "total_cost": Decimal,
            "duration_seconds": int,
            "actions_taken": int,
            "files_modified": List[str],
        }
    },

    "agent.failed": {
        "data": {
            "task_id": int,
            "agent_id": str,
            "error_type": str,
            "error_message": str,
            "recoverable": bool,
            "retry_count": int,
            "last_checkpoint_id": Optional[str],
        }
    },

    "agent.paused": {
        "data": {
            "task_id": int,
            "agent_id": str,
            "reason": str,             # limit_exceeded, error, user_request
            "resume_action": str,      # approval, re_auth, budget_increase
            "checkpoint_id": str,
        }
    },

    # Review lifecycle
    "review.requested": {
        "data": {
            "task_id": int,
            "agent_id": str,
            "result": dict,
            "files_changed": List[str],
            "requested_at": datetime,
        }
    },

    "review.completed": {
        "data": {
            "task_id": int,
            "reviewer_id": str,
            "approved": bool,
            "feedback": Optional[str],
            "completed_at": datetime,
        }
    },
}
```

---

## 3. Dapr Component Configuration

### 3.1 Pub/Sub Component

```yaml
# dapr/components/pubsub-redis.yaml (Development)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: taskflow-pubsub
  namespace: taskflow
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-credentials
        key: password
    - name: consumerID
      value: "{podName}"
    - name: enableTLS
      value: "false"
---
# dapr/components/pubsub-kafka.yaml (Production)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: taskflow-pubsub
  namespace: taskflow
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka-bootstrap.kafka:9092"
    - name: consumerGroup
      value: "taskflow-agents"
    - name: authType
      value: "password"
    - name: saslUsername
      secretKeyRef:
        name: kafka-credentials
        key: username
    - name: saslPassword
      secretKeyRef:
        name: kafka-credentials
        key: password
    - name: initialOffset
      value: "oldest"
    - name: maxMessageBytes
      value: "1048576"  # 1MB
```

### 3.2 Subscriptions

```yaml
# dapr/subscriptions/agent-scheduler.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: task-assigned-to-scheduler
  namespace: taskflow
spec:
  pubsubname: taskflow-pubsub
  topic: task.assigned
  routes:
    rules:
      - match: event.data.assigned_to.startsWith("@agent:")
        path: /events/task-assigned
    default: /events/ignored
  scopes:
    - agent-scheduler
---
# dapr/subscriptions/api-service.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: agent-events-to-api
  namespace: taskflow
spec:
  pubsubname: taskflow-pubsub
  topic: agent.completed
  routes:
    default: /events/agent-completed
  scopes:
    - taskflow-api
---
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: agent-progress-to-api
  namespace: taskflow
spec:
  pubsubname: taskflow-pubsub
  topic: agent.progress
  routes:
    default: /events/agent-progress
  scopes:
    - taskflow-api
---
# dapr/subscriptions/notification-service.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: agent-events-to-notifications
  namespace: taskflow
spec:
  pubsubname: taskflow-pubsub
  topic: agent.*
  routes:
    rules:
      - match: event.type == "agent.completed"
        path: /events/notify-completion
      - match: event.type == "agent.failed"
        path: /events/notify-failure
      - match: event.type == "agent.paused"
        path: /events/notify-pause
  scopes:
    - notification-service
```

### 3.3 State Store Component

```yaml
# dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: agent-statestore
  namespace: taskflow
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-credentials
        key: password
    - name: keyPrefix
      value: "agent"
    - name: actorStateStore
      value: "true"
```

### 3.4 Secrets Component

```yaml
# dapr/components/secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: provider-secrets
  namespace: taskflow
spec:
  type: secretstores.kubernetes
  version: v1
  metadata:
    - name: namespace
      value: "taskflow"
---
# For production with HashiCorp Vault
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: provider-secrets
  namespace: taskflow
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault.internal:8200"
    - name: vaultToken
      secretKeyRef:
        name: vault-token
        key: token
    - name: vaultKVPrefix
      value: "taskflow/providers"
```

---

## 4. Dapr Actors for Agent Lifecycle

### 4.1 Actor Configuration

```yaml
# dapr/config/actor-config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: agent-actor-config
  namespace: taskflow
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
  features:
    - name: Actor.Reentrancy
      enabled: true
  actor:
    idleTimeout: "1h"
    actorScanInterval: "30s"
    drainOngoingCallTimeout: "60s"
    drainRebalancedActors: true
    reentrancy:
      enabled: true
      maxStackDepth: 32
    remindersStoragePartitions: 7
```

### 4.2 Actor Implementation

```python
# src/agents/actors/agent_actor.py
from dapr.actor import Actor, ActorInterface, ActorProxy, Remindable
from dapr.actor.runtime.config import ActorRuntimeConfig, ActorReentrancyConfig

class AgentActorInterface(ActorInterface):
    """Interface for Agent Actor"""

    async def start_execution(self, task_data: dict) -> None:
        """Start task execution"""
        ...

    async def pause_execution(self, reason: str) -> None:
        """Pause execution"""
        ...

    async def resume_execution(self) -> None:
        """Resume from pause/checkpoint"""
        ...

    async def stop_execution(self) -> None:
        """Stop execution completely"""
        ...

    async def get_status(self) -> dict:
        """Get current execution status"""
        ...


class AgentActor(Actor, AgentActorInterface, Remindable):
    """
    Dapr Actor managing agent execution lifecycle.

    Each actor instance manages one task execution.
    Actor ID format: "agent-task-{task_id}"
    """

    def __init__(self, ctx, actor_id):
        super().__init__(ctx, actor_id)
        self._state: Optional[AgentState] = None
        self._provider_client: Optional[UnifiedProviderClient] = None

    async def _on_activate(self) -> None:
        """Called when actor is activated"""
        # Load state from Dapr state store
        has_state, state_data = await self._state_manager.try_get_state("execution_state")
        if has_state:
            self._state = AgentState(**state_data)

    async def _on_deactivate(self) -> None:
        """Called when actor is deactivated"""
        if self._state:
            await self._save_state()

    async def _save_state(self) -> None:
        """Persist state to Dapr state store"""
        await self._state_manager.set_state("execution_state", self._state.model_dump())
        await self._state_manager.save_state()

    # ─────────────────────────────────────────────────────────────────
    # Public Interface Methods
    # ─────────────────────────────────────────────────────────────────

    async def start_execution(self, task_data: dict) -> None:
        """Start task execution"""
        task = Task(**task_data["task"])
        credentials = ProviderCredentials(**task_data["credentials"])

        # Initialize state
        self._state = AgentState(
            task_id=task.id,
            status=AgentStatus.RUNNING,
            started_at=datetime.utcnow(),
            provider=credentials.provider,
            checkpoints=[],
            action_history=[],
            tokens_used=0,
            cost_incurred=Decimal("0"),
        )

        # Initialize provider client
        self._provider_client = UnifiedProviderClient(
            provider=credentials.provider,
            credentials=credentials
        )

        await self._save_state()

        # Publish started event
        await self._publish_event("agent.started", {
            "task_id": task.id,
            "agent_id": str(self.id),
            "started_at": self._state.started_at.isoformat(),
        })

        # Set reminder for progress updates
        await self.register_reminder(
            "progress_update",
            b"",
            timedelta(seconds=30),
            timedelta(seconds=30)
        )

        # Start execution loop
        await self._execute_loop(task)

    async def pause_execution(self, reason: str) -> None:
        """Pause execution and save checkpoint"""
        if self._state.status != AgentStatus.RUNNING:
            return

        self._state.status = AgentStatus.PAUSED
        self._state.pause_reason = reason

        # Create checkpoint
        checkpoint = await self._create_checkpoint()

        await self._save_state()

        # Unregister progress reminder
        await self.unregister_reminder("progress_update")

        # Publish paused event
        await self._publish_event("agent.paused", {
            "task_id": self._state.task_id,
            "agent_id": str(self.id),
            "reason": reason,
            "checkpoint_id": checkpoint.id,
        })

    async def resume_execution(self) -> None:
        """Resume from pause"""
        if self._state.status != AgentStatus.PAUSED:
            return

        self._state.status = AgentStatus.RUNNING
        self._state.pause_reason = None

        await self._save_state()

        # Re-register progress reminder
        await self.register_reminder(
            "progress_update",
            b"",
            timedelta(seconds=30),
            timedelta(seconds=30)
        )

        # Continue execution
        task = await self._load_task(self._state.task_id)
        await self._execute_loop(task)

    async def stop_execution(self) -> None:
        """Stop execution completely"""
        self._state.status = AgentStatus.STOPPED
        self._state.stopped_at = datetime.utcnow()

        await self._save_state()
        await self.unregister_reminder("progress_update")

        # Publish stopped event
        await self._publish_event("agent.failed", {
            "task_id": self._state.task_id,
            "agent_id": str(self.id),
            "error_type": "USER_STOPPED",
            "error_message": "Execution stopped by user",
            "recoverable": False,
        })

    async def get_status(self) -> dict:
        """Get current execution status"""
        return {
            "task_id": self._state.task_id,
            "status": self._state.status,
            "progress_percent": self._calculate_progress(),
            "tokens_used": self._state.tokens_used,
            "cost_incurred": str(self._state.cost_incurred),
            "actions_taken": len(self._state.action_history),
            "started_at": self._state.started_at.isoformat() if self._state.started_at else None,
            "last_action": self._state.action_history[-1] if self._state.action_history else None,
        }

    # ─────────────────────────────────────────────────────────────────
    # Reminder Handler
    # ─────────────────────────────────────────────────────────────────

    async def receive_reminder(self, name: str, state: bytes, due_time: timedelta, period: timedelta) -> None:
        """Handle Dapr reminders"""
        if name == "progress_update":
            await self._publish_progress()

    # ─────────────────────────────────────────────────────────────────
    # Internal Methods
    # ─────────────────────────────────────────────────────────────────

    async def _execute_loop(self, task: Task) -> None:
        """Main execution loop"""
        guardrails = ExecutionGuardrails()

        while self._state.status == AgentStatus.RUNNING:
            try:
                # Check limits
                limit_check = await guardrails.check_limits(
                    task_id=task.id,
                    user_id=task.owner_id,
                    current_usage=self._get_usage()
                )

                if not limit_check.allowed:
                    await self.pause_execution(limit_check.violations[0].type)
                    return

                # Get next action from AI
                action = await self._provider_client.get_next_action(
                    task=task,
                    context=self._state.context,
                    history=self._state.action_history
                )

                # Validate action
                validation = await self._validate_action(action)
                if not validation.valid:
                    await self._handle_invalid_action(action, validation)
                    continue

                # Execute action
                result = await self._execute_action(action)

                # Record action
                self._state.action_history.append(ActionRecord(
                    action=action,
                    result=result,
                    timestamp=datetime.utcnow()
                ))

                # Update usage
                self._state.tokens_used += result.tokens_used
                self._state.cost_incurred += result.cost

                # Checkpoint every 10 actions
                if len(self._state.action_history) % 10 == 0:
                    await self._create_checkpoint()

                await self._save_state()

                # Check for completion
                if action.type == ActionType.COMPLETE:
                    await self._complete(result)
                    return

            except Exception as e:
                await self._handle_error(e)
                if not self._state.status == AgentStatus.RUNNING:
                    return

    async def _execute_action(self, action: AgentAction) -> ActionResult:
        """Execute a single agent action"""
        start_time = datetime.utcnow()

        match action.type:
            case ActionType.TOOL_CALL:
                result = await self._call_tool(action.tool_name, action.tool_args)

                # Publish tool call event
                await self._publish_event("agent.tool.called", {
                    "task_id": self._state.task_id,
                    "agent_id": str(self.id),
                    "tool_name": action.tool_name,
                    "tool_args": action.tool_args,
                    "result_status": result.status,
                    "duration_ms": (datetime.utcnow() - start_time).total_seconds() * 1000,
                })

            case ActionType.CREATE_SUBTASK:
                subtask = await self._create_subtask(action)
                result = ActionResult(
                    status="success",
                    output={"subtask_id": subtask.id}
                )

                # Publish subtask event
                await self._publish_event("agent.subtask.created", {
                    "parent_task_id": self._state.task_id,
                    "subtask_id": subtask.id,
                    "title": action.subtask_title,
                    "assigned_to": action.subtask_assigned_to,
                    "reason": action.subtask_reason,
                })

            case ActionType.THINK:
                # No external action, just update context
                result = ActionResult(status="success", output={"thought": action.thought})

            case ActionType.COMPLETE:
                result = ActionResult(status="success", output=action.completion_result)

        return result

    async def _create_checkpoint(self) -> Checkpoint:
        """Create execution checkpoint"""
        checkpoint = Checkpoint(
            id=str(uuid4()),
            task_id=self._state.task_id,
            state_snapshot=self._state.model_dump(),
            created_at=datetime.utcnow()
        )

        self._state.checkpoints.append(checkpoint)

        # Store checkpoint separately for recovery
        await self._state_manager.set_state(
            f"checkpoint_{checkpoint.id}",
            checkpoint.model_dump()
        )

        return checkpoint

    async def _complete(self, result: ActionResult) -> None:
        """Complete task execution"""
        self._state.status = AgentStatus.COMPLETED
        self._state.completed_at = datetime.utcnow()
        self._state.result = result.output

        await self._save_state()
        await self.unregister_reminder("progress_update")

        # Publish completed event
        await self._publish_event("agent.completed", {
            "task_id": self._state.task_id,
            "agent_id": str(self.id),
            "result": result.output,
            "total_tokens": self._state.tokens_used,
            "total_cost": str(self._state.cost_incurred),
            "duration_seconds": (self._state.completed_at - self._state.started_at).total_seconds(),
            "actions_taken": len(self._state.action_history),
            "files_modified": self._state.files_modified,
        })

    async def _handle_error(self, error: Exception) -> None:
        """Handle execution error"""
        self._state.retry_count += 1

        if self._state.retry_count >= 3:
            # Max retries exceeded
            self._state.status = AgentStatus.FAILED
            self._state.error = str(error)

            await self._save_state()
            await self.unregister_reminder("progress_update")

            await self._publish_event("agent.failed", {
                "task_id": self._state.task_id,
                "agent_id": str(self.id),
                "error_type": type(error).__name__,
                "error_message": str(error),
                "recoverable": False,
                "retry_count": self._state.retry_count,
            })
        else:
            # Retry from checkpoint
            latest_checkpoint = self._state.checkpoints[-1] if self._state.checkpoints else None

            await self._publish_event("agent.failed", {
                "task_id": self._state.task_id,
                "agent_id": str(self.id),
                "error_type": type(error).__name__,
                "error_message": str(error),
                "recoverable": True,
                "retry_count": self._state.retry_count,
                "last_checkpoint_id": latest_checkpoint.id if latest_checkpoint else None,
            })

            # Brief pause before retry
            await asyncio.sleep(2 ** self._state.retry_count)

    async def _publish_event(self, event_type: str, data: dict) -> None:
        """Publish event via Dapr pub/sub"""
        async with DaprClient() as client:
            await client.publish_event(
                pubsub_name="taskflow-pubsub",
                topic_name=event_type,
                data=json.dumps({
                    "id": str(uuid4()),
                    "type": event_type,
                    "source": f"agent-actor/{self.id}",
                    "subject": f"task/{self._state.task_id}",
                    "time": datetime.utcnow().isoformat(),
                    "correlation_id": self._state.correlation_id,
                    "data": data,
                }),
                data_content_type="application/json"
            )

    async def _publish_progress(self) -> None:
        """Publish progress update"""
        await self._publish_event("agent.progress", {
            "task_id": self._state.task_id,
            "agent_id": str(self.id),
            "progress_percent": self._calculate_progress(),
            "message": self._get_progress_message(),
            "tokens_used": self._state.tokens_used,
            "cost_incurred": str(self._state.cost_incurred),
            "action_count": len(self._state.action_history),
        })
```

### 4.3 Actor Registration

```python
# src/agents/main.py
from dapr.actor.runtime.config import ActorRuntimeConfig
from dapr.actor.runtime.runtime import ActorRuntime

# Configure actor runtime
actor_config = ActorRuntimeConfig()
actor_config.update_actor_idle_timeout(timedelta(hours=1))
actor_config.update_actor_scan_interval(timedelta(seconds=30))
actor_config.update_drain_ongoing_call_timeout(timedelta(seconds=60))
actor_config.update_drain_rebalanced_actors(True)
actor_config.update_reentrancy(ActorReentrancyConfig(enabled=True))

# Register actor
ActorRuntime.set_actor_config(actor_config)
ActorRuntime.register_actor(AgentActor)

# FastAPI app with Dapr integration
app = FastAPI()

# Actor health endpoint
@app.get("/healthz")
async def health():
    return {"status": "healthy"}

# Actor invocation endpoints (handled by Dapr runtime)
@app.get("/dapr/config")
async def dapr_config():
    return {
        "entities": ["AgentActor"],
        "actorIdleTimeout": "1h",
        "actorScanInterval": "30s",
        "drainOngoingCallTimeout": "60s",
        "drainRebalancedActors": True,
        "reentrancy": {
            "enabled": True,
            "maxStackDepth": 32
        }
    }
```

---

## 5. Service Communication Patterns

### 5.1 Agent Scheduler Service

```python
# src/agent_scheduler/main.py
from dapr.clients import DaprClient
from dapr.clients.grpc._request import InvokeMethodRequest

app = FastAPI()

@app.post("/events/task-assigned")
async def handle_task_assigned(request: Request):
    """Handle task.assigned event - spawn agent container"""
    cloud_event = CloudEvent.parse(await request.json())
    data = cloud_event.data

    # Skip if assigned to human
    if not data["assigned_to"].startswith("@agent:"):
        return {"status": "skipped", "reason": "human_assignment"}

    # Get credentials via Dapr secrets
    async with DaprClient() as client:
        secret = await client.get_secret(
            store_name="provider-secrets",
            key=f"user/{data['task_owner_id']}/provider/{data['provider']}"
        )

    credentials = ProviderCredentials(**json.loads(secret.secret))

    # Invoke agent actor
    actor_id = f"agent-task-{data['task_id']}"

    async with DaprClient() as client:
        await client.invoke_actor(
            actor_type="AgentActor",
            actor_id=actor_id,
            actor_method="start_execution",
            data=json.dumps({
                "task": data["task"],
                "credentials": credentials.model_dump(),
            })
        )

    return {"status": "spawned", "actor_id": actor_id}


@app.post("/api/tasks/{task_id}/execution/pause")
async def pause_execution(task_id: int, body: PauseRequest):
    """Pause agent execution"""
    actor_id = f"agent-task-{task_id}"

    async with DaprClient() as client:
        await client.invoke_actor(
            actor_type="AgentActor",
            actor_id=actor_id,
            actor_method="pause_execution",
            data=json.dumps({"reason": body.reason})
        )

    return {"status": "paused"}


@app.get("/api/tasks/{task_id}/execution/status")
async def get_execution_status(task_id: int):
    """Get agent execution status"""
    actor_id = f"agent-task-{task_id}"

    async with DaprClient() as client:
        result = await client.invoke_actor(
            actor_type="AgentActor",
            actor_id=actor_id,
            actor_method="get_status",
        )

    return json.loads(result.data)
```

### 5.2 API Service Event Handlers

```python
# src/api/events.py

@app.post("/events/agent-completed")
async def handle_agent_completed(request: Request):
    """Handle agent.completed event - update task status"""
    cloud_event = CloudEvent.parse(await request.json())
    data = cloud_event.data

    # Update task in database
    async with get_db_session() as session:
        task = await session.get(Task, data["task_id"])

        if task.execution_mode == ExecutionMode.REVIEW_ONLY:
            task.status = TaskStatus.REVIEW_PENDING
        else:
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.completed_by = data["agent_id"]

        task.result = data["result"]

        # Create audit entry
        audit = AuditLog(
            task_id=task.id,
            actor_id=data["agent_id"],
            actor_type="agent",
            action="completed",
            context={
                "tokens_used": data["total_tokens"],
                "cost": data["total_cost"],
                "duration": data["duration_seconds"],
            }
        )
        session.add(audit)
        await session.commit()

    # Broadcast to WebSocket clients
    await ws_manager.broadcast_task_update(data["task_id"], {
        "type": "agent_completed",
        "data": data
    })

    return {"status": "processed"}


@app.post("/events/agent-progress")
async def handle_agent_progress(request: Request):
    """Handle agent.progress event - broadcast to clients"""
    cloud_event = CloudEvent.parse(await request.json())
    data = cloud_event.data

    # Broadcast to WebSocket clients
    await ws_manager.broadcast_task_update(data["task_id"], {
        "type": "agent_progress",
        "data": data
    })

    return {"status": "broadcast"}
```

---

## 6. Deployment Configuration

### 6.1 Helm Values for Dapr

```yaml
# helm/taskflow/values.yaml
dapr:
  enabled: true

  pubsub:
    name: taskflow-pubsub
    type: pubsub.redis  # or pubsub.kafka for production

  statestore:
    name: agent-statestore
    type: state.redis

  actors:
    enabled: true
    idleTimeout: 1h
    scanInterval: 30s

agentScheduler:
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

  dapr:
    appId: agent-scheduler
    appPort: 8000
    config: agent-actor-config

agentWorker:
  # Pod template for agent execution
  image: taskflow/agent-runtime:latest
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 2000m
      memory: 4Gi
```

### 6.2 Kubernetes Deployment

```yaml
# helm/taskflow/templates/agent-scheduler-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "taskflow.fullname" . }}-agent-scheduler
spec:
  replicas: {{ .Values.agentScheduler.replicas }}
  selector:
    matchLabels:
      app.kubernetes.io/component: agent-scheduler
  template:
    metadata:
      labels:
        app.kubernetes.io/component: agent-scheduler
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "agent-scheduler"
        dapr.io/app-port: "8000"
        dapr.io/config: "agent-actor-config"
        dapr.io/enable-actors: "true"
    spec:
      containers:
        - name: agent-scheduler
          image: "{{ .Values.agentScheduler.image }}"
          ports:
            - containerPort: 8000
          resources:
            {{- toYaml .Values.agentScheduler.resources | nindent 12 }}
          env:
            - name: DAPR_HTTP_PORT
              value: "3500"
            - name: DAPR_GRPC_PORT
              value: "50001"
```

---

## 7. Observability

### 7.1 Distributed Tracing

```yaml
# dapr/config/tracing.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: agent-tracing
  namespace: taskflow
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://jaeger-collector:9411/api/v2/spans"
```

### 7.2 Metrics

```python
# Prometheus metrics for agent execution
from prometheus_client import Counter, Histogram, Gauge

AGENT_TASKS_TOTAL = Counter(
    "agent_tasks_total",
    "Total agent tasks",
    ["status", "provider"]
)

AGENT_EXECUTION_DURATION = Histogram(
    "agent_execution_duration_seconds",
    "Agent execution duration",
    ["provider"],
    buckets=[60, 300, 600, 1800, 3600, 7200]
)

AGENT_TOKENS_USED = Counter(
    "agent_tokens_used_total",
    "Total tokens used by agents",
    ["provider"]
)

AGENT_COST_INCURRED = Counter(
    "agent_cost_incurred_dollars",
    "Total cost incurred by agents",
    ["provider"]
)

ACTIVE_AGENT_ACTORS = Gauge(
    "active_agent_actors",
    "Number of active agent actors"
)
```

---

## 8. Testing Strategy

### 8.1 Unit Tests for Actors

```python
# tests/test_agent_actor.py
import pytest
from dapr.actor.runtime.mock import MockActorStateManager

@pytest.fixture
def mock_state_manager():
    return MockActorStateManager()

@pytest.fixture
def agent_actor(mock_state_manager):
    ctx = MockActorRuntimeContext(mock_state_manager)
    return AgentActor(ctx, ActorId("test-actor"))

async def test_start_execution(agent_actor, mock_state_manager):
    task_data = {
        "task": {"id": 1, "title": "Test task"},
        "credentials": {"provider": "claude", "api_key": "test-key"}
    }

    await agent_actor.start_execution(task_data)

    # Verify state was saved
    state = await mock_state_manager.get_state("execution_state")
    assert state["status"] == "RUNNING"
    assert state["task_id"] == 1

async def test_pause_execution(agent_actor, mock_state_manager):
    # Setup running state
    await mock_state_manager.set_state("execution_state", {
        "task_id": 1,
        "status": "RUNNING",
    })

    await agent_actor.pause_execution("user_request")

    state = await mock_state_manager.get_state("execution_state")
    assert state["status"] == "PAUSED"
```

### 8.2 Integration Tests

```python
# tests/integration/test_agent_flow.py
import pytest
from testcontainers.redis import RedisContainer
from dapr.clients import DaprClient

@pytest.fixture(scope="module")
def redis_container():
    with RedisContainer() as redis:
        yield redis

async def test_full_agent_flow(redis_container):
    """Test complete agent execution flow"""

    # Publish task.assigned event
    async with DaprClient() as client:
        await client.publish_event(
            pubsub_name="taskflow-pubsub",
            topic_name="task.assigned",
            data=json.dumps({
                "task_id": 1,
                "assigned_to": "@agent:claude-code",
                "provider": "claude",
            })
        )

    # Wait for agent to spawn
    await asyncio.sleep(2)

    # Check actor status
    async with DaprClient() as client:
        status = await client.invoke_actor(
            actor_type="AgentActor",
            actor_id="agent-task-1",
            actor_method="get_status"
        )

    assert json.loads(status.data)["status"] in ["RUNNING", "COMPLETED"]
```

---

## References

- [Dapr Pub/Sub Documentation](https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- [Dapr Actors Documentation](https://docs.dapr.io/developing-applications/building-blocks/actors/)
- [CloudEvents Specification](https://cloudevents.io/)
- [AGENT-CLOUD-EXECUTION.md](./AGENT-CLOUD-EXECUTION.md) - Parent design document
