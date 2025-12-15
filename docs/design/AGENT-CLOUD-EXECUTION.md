# Agent Cloud Execution Design

**Status**: Draft
**Author**: @mjunaidca
**Created**: 2025-12-15
**Last Updated**: 2025-12-15

---

## Executive Summary

Enable custom AI agents to execute tasks autonomously in isolated cloud environments. Users connect their own AI provider accounts (Claude, Gemini, OpenAI, Qwen) via OAuth/API keys, and agents run in containers/VMs completing assigned work without human intervention ("yolo mode").

**Value Proposition**: "GitHub Actions for AI Work" + "Bring Your Own AI"

- Users bring their own API keys → no API cost pressure on platform margins
- Agents work autonomously → 10x productivity multiplier
- Multi-provider support → flexibility and failover
- Agent-to-agent delegation → recursive task decomposition

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Architecture](#2-solution-architecture)
3. [Core Components](#3-core-components)
4. [Dapr Event-Driven Architecture](#4-dapr-event-driven-architecture)
5. [Multi-Provider BYOK Strategy](#5-multi-provider-byok-strategy)
6. [Execution Isolation](#6-execution-isolation)
7. [Agent Lifecycle](#7-agent-lifecycle)
8. [Edge Cases & Failure Modes](#8-edge-cases--failure-modes)
9. [Security Model](#9-security-model)
10. [User Experience](#10-user-experience)
11. [Implementation Phases](#11-implementation-phases)
12. [Open Questions](#12-open-questions)
13. [ADR References](#13-adr-references)

---

## 1. Problem Statement

### Current State
- Tasks assigned to humans only
- AI assistance is synchronous and session-bound
- No autonomous task completion
- Platform bears API costs for AI features

### Desired State
- Tasks assignable to AI agents (same as humans)
- Agents work autonomously in cloud
- Users bring their own AI provider credentials
- Agents can delegate to other agents (recursive)
- Full audit trail of autonomous work

### Success Metrics
| Metric | Target |
|--------|--------|
| Agent task completion rate | >85% |
| Average task completion time | <30 min for standard tasks |
| User cost savings vs platform-provided AI | >50% |
| Agent-initiated subtask success | >90% |

---

## 2. Solution Architecture

### High-Level Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                         TaskFlow Platform                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │   Web UI     │    │   CLI        │    │   MCP Server             │  │
│  │  (Next.js)   │    │  (Python)    │    │   (Agent Interface)      │  │
│  └──────┬───────┘    └──────┬───────┘    └────────────┬─────────────┘  │
│         │                   │                         │                 │
│         └───────────────────┴─────────────────────────┘                 │
│                             │                                           │
│                             ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Dapr Sidecar Mesh                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │  │
│  │  │ Pub/Sub     │  │ State Store │  │ Service Invocation      │   │  │
│  │  │ (Redis/     │  │ (Redis)     │  │ (gRPC/HTTP)             │   │  │
│  │  │  Kafka)     │  │             │  │                         │   │  │
│  │  └──────┬──────┘  └─────────────┘  └─────────────────────────┘   │  │
│  └─────────┼────────────────────────────────────────────────────────┘  │
│            │                                                            │
│            ▼                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Event Topics (Dapr Pub/Sub)                   │  │
│  │                                                                   │  │
│  │  task.assigned ──▶ agent.spawned ──▶ agent.started               │  │
│  │                                                                   │  │
│  │  agent.progress ◀── agent.subtask.created ◀── agent.tool.called  │  │
│  │                                                                   │  │
│  │  agent.completed ──▶ review.requested ──▶ task.completed         │  │
│  │                                                                   │  │
│  │  agent.failed ──▶ agent.retry / agent.escalated                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Agent Execution Layer                          │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │              Agent Scheduler (Dapr Actors)                  │ │  │
│  │  │                                                             │ │  │
│  │  │  Actor: agent-task-001    Actor: agent-task-002             │ │  │
│  │  │  Provider: Claude         Provider: Gemini                  │ │  │
│  │  │  Status: running          Status: waiting                   │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │           Container Pool (Kubernetes + gVisor)              │ │  │
│  │  │                                                             │ │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │ │  │
│  │  │  │ Pod: task-1 │  │ Pod: task-2 │  │ Pod: task-3 │         │ │  │
│  │  │  │ + Workspace │  │ + Workspace │  │ + Workspace │         │ │  │
│  │  │  │ + Audit     │  │ + Audit     │  │ + Audit     │         │ │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘         │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Provider Credentials Vault                     │  │
│  │                                                                   │  │
│  │  User: @mjunaid                                                   │  │
│  │  ├── claude: { api_key: "sk-ant-...", connected: true }          │  │
│  │  ├── gemini: { oauth_token: "...", refresh: "...", exp: ... }    │  │
│  │  └── openai: { api_key: null, connected: false }                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Dapr Pub/Sub** | Event routing between services, task lifecycle events |
| **Dapr Actors** | Agent lifecycle management, state persistence |
| **Dapr State** | Agent context, checkpoint storage |
| **Agent Scheduler** | Container provisioning, resource allocation |
| **Container Pool** | Isolated execution environments |
| **Credentials Vault** | Secure storage for provider API keys/tokens |
| **Audit Collector** | Real-time capture of agent actions |

---

## 3. Core Components

### 3.1 Agent Registry

```python
class AgentType(str, Enum):
    CLAUDE_CODE = "claude-code"      # Claude with code execution
    CLAUDE_CHAT = "claude-chat"      # Claude conversation only
    GEMINI_CODE = "gemini-code"      # Gemini with code execution
    GPT4_CODE = "gpt4-code"          # GPT-4 with code execution
    QWEN_CODE = "qwen-code"          # Qwen with code execution
    CUSTOM = "custom"                # User-defined agent

class AgentDefinition(BaseModel):
    id: str                          # Unique identifier
    name: str                        # Display name
    type: AgentType
    provider: str                    # claude, gemini, openai, qwen
    capabilities: List[str]          # code_execution, file_access, web_search
    trust_level: TrustLevel          # trusted, verified, untrusted
    max_runtime: timedelta           # Maximum execution time
    max_cost: Decimal                # Maximum cost per task
    system_prompt: Optional[str]     # Custom system prompt
    tools: List[str]                 # Enabled MCP tools
    created_by: str                  # Owner user/org
    is_public: bool                  # Available in marketplace
```

### 3.2 Task Assignment Model

```python
class TaskAssignment(BaseModel):
    task_id: int
    assigned_to: str                 # @human:mjunaid OR @agent:claude-code
    assigned_by: str                 # Who made the assignment
    execution_mode: ExecutionMode    # yolo, supervised, review_only
    provider_override: Optional[str] # Use specific provider
    budget_limit: Optional[Decimal]  # Max cost for this task
    created_at: datetime

class ExecutionMode(str, Enum):
    YOLO = "yolo"                    # Fully autonomous
    SUPERVISED = "supervised"        # Pause at each step for approval
    REVIEW_ONLY = "review_only"      # Complete, then request review
```

### 3.3 Provider Credentials

```python
class ProviderCredentials(BaseModel):
    user_id: str
    provider: str                    # claude, gemini, openai, qwen
    auth_type: AuthType              # api_key, oauth

    # For API key auth
    api_key: Optional[SecretStr]

    # For OAuth
    access_token: Optional[SecretStr]
    refresh_token: Optional[SecretStr]
    token_expiry: Optional[datetime]

    # Metadata
    connected_at: datetime
    last_used: Optional[datetime]
    usage_this_month: Decimal        # Cost tracking

class AuthType(str, Enum):
    API_KEY = "api_key"
    OAUTH = "oauth"
```

---

## 4. Dapr Event-Driven Architecture

### 4.1 Event Definitions

```python
# All events inherit from base
class TaskFlowEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    correlation_id: str              # Links related events
    actor_id: str                    # Who triggered this
    actor_type: Literal["human", "agent", "system"]

# Task lifecycle events
class TaskAssignedEvent(TaskFlowEvent):
    event_type: str = "task.assigned"
    task_id: int
    assigned_to: str
    execution_mode: ExecutionMode
    provider: str

class AgentSpawnedEvent(TaskFlowEvent):
    event_type: str = "agent.spawned"
    task_id: int
    agent_id: str
    container_id: str
    provider: str

class AgentProgressEvent(TaskFlowEvent):
    event_type: str = "agent.progress"
    task_id: int
    agent_id: str
    progress_percent: int
    message: str
    tokens_used: int
    cost_incurred: Decimal

class AgentSubtaskCreatedEvent(TaskFlowEvent):
    event_type: str = "agent.subtask.created"
    parent_task_id: int
    subtask_id: int
    assigned_to: str                 # Could be another agent
    reason: str

class AgentCompletedEvent(TaskFlowEvent):
    event_type: str = "agent.completed"
    task_id: int
    agent_id: str
    result: dict
    total_tokens: int
    total_cost: Decimal
    duration_seconds: int

class AgentFailedEvent(TaskFlowEvent):
    event_type: str = "agent.failed"
    task_id: int
    agent_id: str
    error_type: str
    error_message: str
    recoverable: bool
    retry_count: int
```

### 4.2 Dapr Pub/Sub Configuration

```yaml
# dapr/components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: taskflow-pubsub
  namespace: taskflow
spec:
  type: pubsub.redis  # or pubsub.kafka for production
  version: v1
  metadata:
    - name: redisHost
      value: redis:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
---
# Subscription configuration
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: task-assigned-sub
  namespace: taskflow
spec:
  pubsubname: taskflow-pubsub
  topic: task.assigned
  routes:
    default: /events/task-assigned
  scopes:
    - agent-scheduler
---
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: agent-completed-sub
  namespace: taskflow
spec:
  pubsubname: taskflow-pubsub
  topic: agent.completed
  routes:
    default: /events/agent-completed
  scopes:
    - taskflow-api
    - notification-service
```

### 4.3 Event Handlers

```python
# Agent Scheduler Service
@app.post("/events/task-assigned")
async def handle_task_assigned(request: Request):
    """When task assigned to agent, spawn execution container"""
    event = CloudEvent.parse(await request.json())
    data = TaskAssignedEvent(**event.data)

    if not data.assigned_to.startswith("@agent:"):
        return {"status": "ignored", "reason": "human assignment"}

    # Get user credentials for the provider
    credentials = await vault.get_credentials(
        user_id=data.actor_id,
        provider=data.provider
    )

    if not credentials:
        await publish_event(AgentFailedEvent(
            task_id=data.task_id,
            error_type="NO_CREDENTIALS",
            error_message=f"No {data.provider} credentials configured",
            recoverable=False
        ))
        return {"status": "failed", "reason": "no_credentials"}

    # Spawn container
    container = await container_pool.spawn(
        task_id=data.task_id,
        agent_type=data.assigned_to.split(":")[1],
        provider=data.provider,
        credentials=credentials,
        execution_mode=data.execution_mode
    )

    await publish_event(AgentSpawnedEvent(
        task_id=data.task_id,
        agent_id=data.assigned_to,
        container_id=container.id,
        provider=data.provider,
        correlation_id=data.correlation_id
    ))

    return {"status": "spawned", "container_id": container.id}
```

### 4.4 Dapr Actors for Agent State

```python
# Agent Actor manages lifecycle and state
class AgentActor:
    """Dapr Actor for managing agent execution state"""

    def __init__(self, ctx: ActorRuntimeContext, actor_id: ActorId):
        self.ctx = ctx
        self.actor_id = actor_id
        self._state: Optional[AgentState] = None

    async def activate(self):
        """Load state on actor activation"""
        self._state = await self.ctx.state_manager.try_get_state("agent_state")

    async def start_execution(self, task: Task, credentials: ProviderCredentials):
        """Begin autonomous task execution"""
        self._state = AgentState(
            task_id=task.id,
            status=AgentStatus.RUNNING,
            started_at=datetime.utcnow(),
            checkpoints=[]
        )
        await self._save_state()

        # Start execution loop
        await self._execute_loop(task, credentials)

    async def _execute_loop(self, task: Task, credentials: ProviderCredentials):
        """Main agent execution loop"""
        client = self._get_provider_client(credentials)

        while self._state.status == AgentStatus.RUNNING:
            try:
                # Get next action from AI
                action = await client.get_next_action(
                    task=task,
                    context=self._state.context,
                    history=self._state.action_history
                )

                # Execute action
                result = await self._execute_action(action)

                # Update state
                self._state.action_history.append(ActionRecord(
                    action=action,
                    result=result,
                    timestamp=datetime.utcnow()
                ))

                # Checkpoint periodically
                if len(self._state.action_history) % 5 == 0:
                    await self._checkpoint()

                # Check completion
                if action.type == ActionType.COMPLETE:
                    self._state.status = AgentStatus.COMPLETED
                    await self._complete(result)

            except Exception as e:
                await self._handle_error(e)

        await self._save_state()

    async def _checkpoint(self):
        """Save checkpoint for recovery"""
        checkpoint = Checkpoint(
            state=self._state.model_dump(),
            timestamp=datetime.utcnow()
        )
        self._state.checkpoints.append(checkpoint)
        await self._save_state()

        await publish_event(AgentProgressEvent(
            task_id=self._state.task_id,
            agent_id=str(self.actor_id),
            progress_percent=self._calculate_progress(),
            message=f"Checkpoint saved: {len(self._state.action_history)} actions"
        ))

    async def resume_from_checkpoint(self, checkpoint_id: str):
        """Resume execution from a checkpoint after failure"""
        checkpoint = self._state.get_checkpoint(checkpoint_id)
        self._state = AgentState(**checkpoint.state)
        self._state.status = AgentStatus.RUNNING
        await self._execute_loop(...)
```

---

## 5. Multi-Provider BYOK Strategy

### 5.1 Supported Providers

| Provider | Auth Type | Context Limit | Features |
|----------|-----------|---------------|----------|
| **Claude** (Anthropic) | API Key | 200K tokens | Code execution, tool use, vision |
| **Gemini** (Google) | OAuth / API Key | 1M tokens | Code execution, grounding, vision |
| **GPT-4** (OpenAI) | API Key | 128K tokens | Code interpreter, DALL-E, vision |
| **Qwen** (Alibaba) | API Key | 32K tokens | Code execution, multilingual |
| **Mistral** | API Key | 32K tokens | Code execution, function calling |

### 5.2 OAuth Flow Implementation

```python
class ProviderOAuth:
    """Handle OAuth and API key connections for AI providers"""

    PROVIDERS = {
        "claude": {
            "type": "api_key",
            "name": "Claude (Anthropic)",
            "docs_url": "https://console.anthropic.com/",
            "key_prefix": "sk-ant-",
            "test_endpoint": "https://api.anthropic.com/v1/messages",
        },
        "gemini": {
            "type": "oauth",
            "name": "Gemini (Google)",
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "scopes": ["https://www.googleapis.com/auth/generative-language"],
            "test_endpoint": "https://generativelanguage.googleapis.com/v1/models",
        },
        "openai": {
            "type": "api_key",
            "name": "GPT-4 (OpenAI)",
            "docs_url": "https://platform.openai.com/api-keys",
            "key_prefix": "sk-",
            "test_endpoint": "https://api.openai.com/v1/models",
        },
        "qwen": {
            "type": "api_key",
            "name": "Qwen (Alibaba)",
            "docs_url": "https://dashscope.console.aliyun.com/",
            "key_prefix": "",
            "test_endpoint": "https://dashscope.aliyuncs.com/api/v1/services",
        },
    }

# API endpoints
@router.get("/providers")
async def list_providers(user: User = Depends(get_current_user)):
    """List all providers and user's connection status"""
    connections = await vault.get_user_connections(user.id)

    return [
        {
            "id": provider_id,
            "name": config["name"],
            "auth_type": config["type"],
            "connected": provider_id in connections,
            "connected_at": connections.get(provider_id, {}).get("connected_at"),
            "usage_this_month": connections.get(provider_id, {}).get("usage", 0),
        }
        for provider_id, config in ProviderOAuth.PROVIDERS.items()
    ]

@router.get("/providers/{provider}/connect")
async def connect_provider(
    provider: str,
    user: User = Depends(get_current_user)
):
    """Initiate provider connection"""
    if provider not in ProviderOAuth.PROVIDERS:
        raise HTTPException(404, f"Unknown provider: {provider}")

    config = ProviderOAuth.PROVIDERS[provider]

    if config["type"] == "api_key":
        # Return form for API key input
        return {
            "auth_type": "api_key",
            "provider": provider,
            "docs_url": config["docs_url"],
            "instructions": f"Enter your {config['name']} API key",
        }

    # OAuth flow
    state = create_oauth_state(user.id, provider)
    auth_url = (
        f"{config['auth_url']}?"
        f"client_id={settings.oauth_clients[provider]['client_id']}&"
        f"redirect_uri={settings.base_url}/api/providers/{provider}/callback&"
        f"scope={' '.join(config['scopes'])}&"
        f"state={state}&"
        f"response_type=code&"
        f"access_type=offline&"
        f"prompt=consent"
    )

    return {"auth_type": "oauth", "auth_url": auth_url}

@router.post("/providers/{provider}/api-key")
async def save_api_key(
    provider: str,
    body: ApiKeyInput,
    user: User = Depends(get_current_user)
):
    """Save API key for a provider"""
    config = ProviderOAuth.PROVIDERS[provider]

    # Validate key format
    if config.get("key_prefix") and not body.api_key.startswith(config["key_prefix"]):
        raise HTTPException(400, f"Invalid API key format for {provider}")

    # Test the key
    is_valid = await test_provider_key(provider, body.api_key)
    if not is_valid:
        raise HTTPException(400, "API key validation failed")

    # Store encrypted
    await vault.store_credentials(
        user_id=user.id,
        provider=provider,
        credentials=ProviderCredentials(
            user_id=user.id,
            provider=provider,
            auth_type=AuthType.API_KEY,
            api_key=body.api_key,
            connected_at=datetime.utcnow()
        )
    )

    return {"status": "connected", "provider": provider}

@router.get("/providers/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str,
    state: str
):
    """Handle OAuth callback"""
    user_id = verify_oauth_state(state, provider)
    config = ProviderOAuth.PROVIDERS[provider]

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        response = await client.post(
            config["token_url"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": f"{settings.base_url}/api/providers/{provider}/callback",
                "client_id": settings.oauth_clients[provider]["client_id"],
                "client_secret": settings.oauth_clients[provider]["client_secret"],
            }
        )
        tokens = response.json()

    # Store credentials
    await vault.store_credentials(
        user_id=user_id,
        provider=provider,
        credentials=ProviderCredentials(
            user_id=user_id,
            provider=provider,
            auth_type=AuthType.OAUTH,
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            token_expiry=datetime.utcnow() + timedelta(seconds=tokens["expires_in"]),
            connected_at=datetime.utcnow()
        )
    )

    # Redirect to settings page
    return RedirectResponse(f"{settings.frontend_url}/settings/providers?connected={provider}")
```

### 5.3 Unified Provider Client

```python
class UnifiedProviderClient:
    """Unified interface for all AI providers"""

    def __init__(self, provider: str, credentials: ProviderCredentials):
        self.provider = provider
        self.credentials = credentials
        self._client = self._create_client()

    def _create_client(self):
        match self.provider:
            case "claude":
                return anthropic.Anthropic(api_key=self.credentials.api_key)
            case "gemini":
                return genai.GenerativeModel(
                    "gemini-1.5-pro",
                    api_key=self.credentials.access_token
                )
            case "openai":
                return openai.OpenAI(api_key=self.credentials.api_key)
            case "qwen":
                return DashScope(api_key=self.credentials.api_key)
            case _:
                raise ValueError(f"Unknown provider: {self.provider}")

    async def get_next_action(
        self,
        task: Task,
        context: AgentContext,
        history: List[ActionRecord]
    ) -> AgentAction:
        """Get next action from AI - unified across providers"""

        messages = self._build_messages(task, context, history)
        tools = self._get_available_tools(task)

        match self.provider:
            case "claude":
                response = await self._client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=self._get_system_prompt(task),
                    messages=messages,
                    tools=tools
                )
                return self._parse_claude_response(response)

            case "gemini":
                response = await self._client.generate_content(
                    messages,
                    tools=tools
                )
                return self._parse_gemini_response(response)

            case "openai":
                response = await self._client.chat.completions.create(
                    model="gpt-4-turbo",
                    messages=messages,
                    tools=tools
                )
                return self._parse_openai_response(response)

    async def refresh_if_needed(self) -> bool:
        """Refresh OAuth token if expired"""
        if self.credentials.auth_type != AuthType.OAUTH:
            return True

        if self.credentials.token_expiry > datetime.utcnow() + timedelta(minutes=5):
            return True  # Still valid

        # Refresh token
        new_tokens = await self._refresh_oauth_token()
        self.credentials.access_token = new_tokens["access_token"]
        self.credentials.token_expiry = datetime.utcnow() + timedelta(
            seconds=new_tokens["expires_in"]
        )

        # Update vault
        await vault.update_credentials(self.credentials)
        return True
```

---

## 6. Execution Isolation

### 6.1 Trust Tiers

```python
class TrustLevel(str, Enum):
    TRUSTED = "trusted"        # Platform-provided agents
    VERIFIED = "verified"      # Reviewed custom agents
    UNTRUSTED = "untrusted"    # Unknown/new agents

class IsolationStrategy:
    """Determine isolation level based on trust"""

    ISOLATION_MAP = {
        TrustLevel.TRUSTED: "container",      # Standard Docker
        TrustLevel.VERIFIED: "gvisor",        # Container + gVisor
        TrustLevel.UNTRUSTED: "firecracker",  # MicroVM
    }

    @classmethod
    def get_runtime_class(cls, trust_level: TrustLevel) -> str:
        return cls.ISOLATION_MAP[trust_level]
```

### 6.2 Container Security Configuration

```yaml
# Kubernetes Pod Security for Agent Containers
apiVersion: v1
kind: Pod
metadata:
  name: agent-task-${TASK_ID}
  namespace: taskflow-agents
  labels:
    app: agent-execution
    task-id: "${TASK_ID}"
    trust-level: "${TRUST_LEVEL}"
spec:
  runtimeClassName: ${RUNTIME_CLASS}  # gvisor or kata for untrusted

  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    runAsGroup: 65534
    fsGroup: 65534
    seccompProfile:
      type: RuntimeDefault

  containers:
    - name: agent
      image: taskflow/agent-runtime:latest

      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]

      resources:
        requests:
          cpu: "100m"
          memory: "256Mi"
        limits:
          cpu: "2000m"
          memory: "4Gi"
          ephemeral-storage: "10Gi"

      volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: tmp
          mountPath: /tmp

      env:
        - name: TASK_ID
          value: "${TASK_ID}"
        - name: PROVIDER
          value: "${PROVIDER}"
        - name: EXECUTION_MODE
          value: "${EXECUTION_MODE}"
        # Credentials injected via Dapr secrets

    - name: audit-sidecar
      image: taskflow/audit-collector:latest

      volumeMounts:
        - name: workspace
          mountPath: /workspace
          readOnly: true

      resources:
        requests:
          cpu: "50m"
          memory: "64Mi"
        limits:
          cpu: "100m"
          memory: "128Mi"

  volumes:
    - name: workspace
      emptyDir:
        sizeLimit: 10Gi
    - name: tmp
      emptyDir:
        sizeLimit: 1Gi

  # Network policy: egress only to allowed domains
  # Applied via NetworkPolicy resource
```

### 6.3 Network Egress Control

```yaml
# NetworkPolicy for agent pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: agent-egress-policy
  namespace: taskflow-agents
spec:
  podSelector:
    matchLabels:
      app: agent-execution
  policyTypes:
    - Egress
  egress:
    # Allow Dapr sidecar communication
    - to:
        - namespaceSelector:
            matchLabels:
              name: dapr-system
      ports:
        - port: 3500
          protocol: TCP

    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP

    # Allow AI provider APIs (via egress gateway)
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - port: 443
          protocol: TCP
---
# Egress gateway for API allowlist
# (Implementation depends on service mesh - Istio/Linkerd)
```

### 6.4 Resource Limits and Guardrails

```python
class ExecutionGuardrails:
    """Enforce resource limits and cost controls"""

    # Default limits (can be overridden per-org)
    DEFAULT_LIMITS = {
        "max_runtime_seconds": 7200,      # 2 hours
        "max_tokens_per_task": 500_000,
        "max_api_calls_per_task": 1000,
        "max_cost_per_task": Decimal("10.00"),
        "max_subtasks_per_task": 20,
        "max_file_size_mb": 100,
        "max_total_files": 1000,
    }

    async def check_limits(
        self,
        task_id: int,
        user_id: str,
        current_usage: TaskUsage
    ) -> LimitCheckResult:
        """Check if task is within limits"""
        limits = await self.get_user_limits(user_id)

        violations = []

        if current_usage.runtime_seconds > limits.max_runtime_seconds:
            violations.append(LimitViolation(
                type="RUNTIME_EXCEEDED",
                limit=limits.max_runtime_seconds,
                current=current_usage.runtime_seconds
            ))

        if current_usage.tokens_used > limits.max_tokens_per_task:
            violations.append(LimitViolation(
                type="TOKEN_LIMIT_EXCEEDED",
                limit=limits.max_tokens_per_task,
                current=current_usage.tokens_used
            ))

        if current_usage.cost_incurred > limits.max_cost_per_task:
            violations.append(LimitViolation(
                type="COST_LIMIT_EXCEEDED",
                limit=limits.max_cost_per_task,
                current=current_usage.cost_incurred
            ))

        if violations:
            return LimitCheckResult(
                allowed=False,
                violations=violations,
                action="PAUSE_FOR_APPROVAL"
            )

        # Check for anomalies (possible infinite loop)
        if self._detect_loop_pattern(current_usage):
            return LimitCheckResult(
                allowed=False,
                violations=[LimitViolation(type="LOOP_DETECTED")],
                action="PAUSE_FOR_REVIEW"
            )

        return LimitCheckResult(allowed=True)

    def _detect_loop_pattern(self, usage: TaskUsage) -> bool:
        """Detect if agent is in an infinite loop"""
        recent_actions = usage.action_history[-20:]

        if len(recent_actions) < 10:
            return False

        # Check for repeated identical actions
        action_hashes = [hash(str(a)) for a in recent_actions]
        unique_ratio = len(set(action_hashes)) / len(action_hashes)

        if unique_ratio < 0.3:  # Less than 30% unique actions
            return True

        return False
```

---

## 7. Agent Lifecycle

### 7.1 State Machine

```
                                    ┌─────────────────┐
                                    │     CREATED     │
                                    └────────┬────────┘
                                             │ assign to agent
                                             ▼
                                    ┌─────────────────┐
                         ┌──────────│    QUEUED       │
                         │          └────────┬────────┘
                         │                   │ spawn container
                         │                   ▼
                         │          ┌─────────────────┐
                         │          │   SPAWNING      │
                         │          └────────┬────────┘
                         │                   │ container ready
                         │                   ▼
                         │          ┌─────────────────┐
     credential expired  │   ┌──────│    RUNNING      │◀─────┐
     or limit exceeded   │   │      └────────┬────────┘      │
                         │   │               │               │
                         │   │    ┌──────────┼──────────┐    │
                         │   │    ▼          ▼          ▼    │
                         │   │ complete   subtask    error   │ retry
                         │   │    │       created      │     │
                         │   │    │          │         │     │
                         │   │    ▼          │         ▼     │
                         │   │ ┌──────┐      │    ┌────────┐ │
                         │   │ │REVIEW│      │    │ FAILED │─┘
                         │   │ │NEEDED│      │    └────┬───┘
                         │   │ └──┬───┘      │         │ unrecoverable
                         │   │    │          │         ▼
                         │   │    │ approved │    ┌────────┐
                         │   │    ▼          │    │ESCALATED│
                         │   │ ┌──────────┐  │    └────────┘
                         │   └▶│COMPLETED │◀─┘
                         │     └──────────┘
                         │
                         │     ┌─────────────────┐
                         └────▶│     PAUSED      │
                               │ (awaiting user) │
                               └─────────────────┘
```

### 7.2 Lifecycle Implementation

```python
class AgentLifecycle:
    """Manage agent execution lifecycle"""

    async def assign_to_agent(
        self,
        task: Task,
        agent_type: str,
        execution_mode: ExecutionMode,
        assigned_by: str
    ) -> AgentAssignment:
        """Assign task to an agent"""

        # Validate agent exists and user has access
        agent_def = await self.agent_registry.get(agent_type)
        if not agent_def:
            raise AgentNotFoundError(agent_type)

        # Get credentials for the provider
        credentials = await self.vault.get_credentials(
            user_id=task.owner_id,
            provider=agent_def.provider
        )
        if not credentials:
            raise NoCredentialsError(
                f"No {agent_def.provider} credentials configured. "
                f"Connect at /settings/providers/{agent_def.provider}"
            )

        # Create assignment
        assignment = AgentAssignment(
            task_id=task.id,
            agent_type=agent_type,
            provider=agent_def.provider,
            execution_mode=execution_mode,
            assigned_by=assigned_by,
            status=AgentStatus.QUEUED,
            created_at=datetime.utcnow()
        )
        await self.db.save(assignment)

        # Publish event
        await self.dapr.publish("taskflow-pubsub", "task.assigned", {
            "task_id": task.id,
            "assigned_to": f"@agent:{agent_type}",
            "execution_mode": execution_mode,
            "provider": agent_def.provider,
            "correlation_id": str(uuid4()),
            "actor_id": assigned_by,
            "actor_type": "human"
        })

        return assignment

    async def spawn_agent(self, event: TaskAssignedEvent) -> str:
        """Spawn container for agent execution"""

        # Get agent definition
        agent_type = event.assigned_to.split(":")[1]
        agent_def = await self.agent_registry.get(agent_type)

        # Determine isolation level
        runtime_class = IsolationStrategy.get_runtime_class(agent_def.trust_level)

        # Create pod
        pod_manifest = self._build_pod_manifest(
            task_id=event.task_id,
            agent_def=agent_def,
            runtime_class=runtime_class,
            execution_mode=event.execution_mode
        )

        container_id = await self.k8s.create_pod(
            namespace="taskflow-agents",
            manifest=pod_manifest
        )

        # Update assignment status
        await self.db.update_assignment(
            task_id=event.task_id,
            status=AgentStatus.SPAWNING,
            container_id=container_id
        )

        return container_id

    async def handle_completion(self, event: AgentCompletedEvent):
        """Handle agent completion"""

        assignment = await self.db.get_assignment(event.task_id)

        if assignment.execution_mode == ExecutionMode.REVIEW_ONLY:
            # Request human review
            assignment.status = AgentStatus.REVIEW_NEEDED
            await self.db.save(assignment)

            await self.dapr.publish("taskflow-pubsub", "review.requested", {
                "task_id": event.task_id,
                "result": event.result,
                "agent_id": event.agent_id
            })
        else:
            # Mark complete
            assignment.status = AgentStatus.COMPLETED
            assignment.completed_at = datetime.utcnow()
            assignment.result = event.result
            await self.db.save(assignment)

            # Update task
            await self.task_service.complete(
                task_id=event.task_id,
                completed_by=event.agent_id,
                result=event.result
            )

        # Cleanup container
        await self.k8s.delete_pod(
            namespace="taskflow-agents",
            name=f"agent-task-{event.task_id}"
        )
```

---

## 8. Edge Cases & Failure Modes

### 8.1 Credential Failures

| Scenario | Detection | Mitigation |
|----------|-----------|------------|
| API key invalid | 401 from provider | Pause task, notify user, provide re-auth link |
| OAuth token expired | Token expiry check | Auto-refresh if refresh token available |
| Refresh token revoked | Refresh fails | Pause task, notify user, require re-OAuth |
| Rate limited | 429 from provider | Exponential backoff, failover to backup provider |
| Quota exhausted | Provider-specific error | Notify user, pause until next billing cycle |

```python
class CredentialErrorHandler:
    async def handle_auth_error(
        self,
        task_id: int,
        provider: str,
        error: Exception
    ):
        if isinstance(error, InvalidCredentialsError):
            await self.pause_task(
                task_id,
                reason=f"Invalid {provider} credentials",
                action_required="re_authenticate",
                action_url=f"/settings/providers/{provider}/connect"
            )
            await self.notify_user(
                f"Your {provider} API key is invalid. Please reconnect."
            )

        elif isinstance(error, TokenExpiredError):
            # Try refresh
            try:
                await self.refresh_credentials(provider)
                return  # Continue execution
            except RefreshFailedError:
                await self.pause_task(
                    task_id,
                    reason=f"{provider} session expired",
                    action_required="re_authenticate"
                )

        elif isinstance(error, RateLimitError):
            # Check for backup provider
            backup = await self.get_backup_provider(provider)
            if backup:
                await self.failover_to_provider(task_id, backup)
            else:
                wait_time = error.retry_after or 60
                await self.pause_task(
                    task_id,
                    reason=f"Rate limited by {provider}",
                    resume_after=timedelta(seconds=wait_time)
                )
```

### 8.2 Execution Failures

| Scenario | Detection | Mitigation |
|----------|-----------|------------|
| Container crash | Pod status change | Auto-restart from last checkpoint |
| OOM kill | Container exit code 137 | Increase memory limit, warn user |
| Infinite loop | Loop detection algorithm | Pause, notify user for review |
| Network partition | Timeout on API calls | Retry with backoff, checkpoint frequently |
| Disk full | Disk pressure on node | Cleanup old files, request larger volume |

```python
class ExecutionErrorHandler:
    MAX_RETRIES = 3

    async def handle_container_failure(
        self,
        task_id: int,
        exit_code: int,
        logs: str
    ):
        assignment = await self.db.get_assignment(task_id)

        if exit_code == 137:  # OOM
            if assignment.retry_count < self.MAX_RETRIES:
                # Retry with more memory
                await self.retry_with_increased_resources(
                    task_id,
                    memory_multiplier=1.5
                )
            else:
                await self.escalate_to_human(
                    task_id,
                    reason="Task requires more memory than allowed"
                )

        elif exit_code == 1:  # Application error
            # Check for checkpoint
            checkpoint = await self.get_latest_checkpoint(task_id)
            if checkpoint and assignment.retry_count < self.MAX_RETRIES:
                await self.resume_from_checkpoint(task_id, checkpoint)
            else:
                await self.escalate_to_human(
                    task_id,
                    reason="Agent encountered unrecoverable error",
                    logs=logs
                )

        else:
            # Unknown error
            await self.escalate_to_human(
                task_id,
                reason=f"Container exited with code {exit_code}",
                logs=logs
            )
```

### 8.3 Agent Logic Failures

| Scenario | Detection | Mitigation |
|----------|-----------|------------|
| Circular delegation | Delegation chain tracking | Block and notify |
| Excessive subtasks | Count against limit | Pause at limit, require approval |
| Conflicting file edits | Concurrent modification detection | Merge or escalate |
| Hallucinated tools | Tool call validation | Reject invalid tool calls |
| Security violation | Security policy enforcement | Block and audit |

```python
class AgentLogicValidator:
    async def validate_action(
        self,
        task_id: int,
        action: AgentAction
    ) -> ValidationResult:
        """Validate agent action before execution"""

        if action.type == ActionType.DELEGATE:
            # Check for circular delegation
            chain = await self.get_delegation_chain(task_id)
            if action.delegate_to in chain:
                return ValidationResult(
                    valid=False,
                    reason=f"Circular delegation: {' → '.join(chain)} → {action.delegate_to}"
                )

            if len(chain) > 10:
                return ValidationResult(
                    valid=False,
                    reason="Delegation depth limit exceeded"
                )

        elif action.type == ActionType.CREATE_SUBTASK:
            # Check subtask limit
            subtask_count = await self.count_subtasks(task_id)
            limits = await self.get_task_limits(task_id)

            if subtask_count >= limits.max_subtasks:
                return ValidationResult(
                    valid=False,
                    reason=f"Subtask limit ({limits.max_subtasks}) reached",
                    action="REQUIRE_APPROVAL"
                )

        elif action.type == ActionType.EXECUTE_CODE:
            # Validate code safety
            safety_check = await self.security_scanner.scan(action.code)
            if not safety_check.safe:
                return ValidationResult(
                    valid=False,
                    reason=f"Security violation: {safety_check.violations}",
                    action="BLOCK_AND_AUDIT"
                )

        elif action.type == ActionType.TOOL_CALL:
            # Validate tool exists and is allowed
            if action.tool_name not in self.allowed_tools:
                return ValidationResult(
                    valid=False,
                    reason=f"Unknown or disallowed tool: {action.tool_name}"
                )

        return ValidationResult(valid=True)
```

### 8.4 Cost Control Failures

| Scenario | Detection | Mitigation |
|----------|-----------|------------|
| Budget exceeded | Real-time cost tracking | Hard stop at limit |
| Runaway API calls | Call rate monitoring | Throttle and warn |
| Expensive model used | Model tracking | Enforce model restrictions |
| Long-running task | Duration monitoring | Warn at 80%, stop at 100% |

```python
class CostController:
    async def track_usage(
        self,
        task_id: int,
        usage: UsageRecord
    ):
        """Track and enforce cost limits"""

        total_usage = await self.aggregate_usage(task_id)
        total_usage.add(usage)

        limits = await self.get_task_limits(task_id)

        # Cost check
        if total_usage.cost >= limits.max_cost:
            await self.hard_stop(
                task_id,
                reason=f"Cost limit (${limits.max_cost}) exceeded"
            )
            return

        if total_usage.cost >= limits.max_cost * Decimal("0.8"):
            await self.warn_user(
                task_id,
                f"Task at 80% of cost budget (${total_usage.cost:.2f}/${limits.max_cost})"
            )

        # Token check
        if total_usage.tokens >= limits.max_tokens:
            await self.hard_stop(
                task_id,
                reason=f"Token limit ({limits.max_tokens:,}) exceeded"
            )
            return

        # Duration check
        if total_usage.duration >= limits.max_duration:
            await self.hard_stop(
                task_id,
                reason=f"Time limit ({limits.max_duration}s) exceeded"
            )
            return

        await self.save_usage(task_id, total_usage)
```

---

## 9. Security Model

### 9.1 Threat Model

| Threat | Impact | Mitigation |
|--------|--------|------------|
| **Credential theft** | API key exposure | Encrypted vault, short-lived tokens, audit access |
| **Container escape** | Host compromise | gVisor/Firecracker, no root, seccomp |
| **Data exfiltration** | Sensitive data leak | Egress filtering, allowlist domains |
| **Malicious agent** | Arbitrary code execution | Sandboxing, code review, trust tiers |
| **Prompt injection** | Agent manipulation | Input sanitization, output validation |
| **Resource exhaustion** | DoS | Quotas, rate limits, isolation |

### 9.2 Security Controls

```python
class SecurityControls:
    """Security controls for agent execution"""

    # Credential security
    CREDENTIAL_ENCRYPTION = "AES-256-GCM"
    TOKEN_MAX_AGE = timedelta(hours=2)

    # Container security
    CONTAINER_USER = 65534  # nobody
    CAPABILITIES_DROP = ["ALL"]
    SECCOMP_PROFILE = "RuntimeDefault"

    # Network security
    EGRESS_ALLOWLIST = [
        "api.anthropic.com",
        "api.openai.com",
        "generativelanguage.googleapis.com",
        "dashscope.aliyuncs.com",
        "github.com",
        "api.github.com",
    ]

    # Code execution security
    FORBIDDEN_OPERATIONS = [
        "subprocess.call",
        "os.system",
        "eval(",
        "exec(",
        "__import__",
        "open('/etc",
        "open('/proc",
    ]

    async def validate_code(self, code: str) -> SecurityResult:
        """Validate code before execution"""
        for pattern in self.FORBIDDEN_OPERATIONS:
            if pattern in code:
                return SecurityResult(
                    safe=False,
                    violation=f"Forbidden operation: {pattern}"
                )

        # Additional AST analysis
        try:
            tree = ast.parse(code)
            violations = self._analyze_ast(tree)
            if violations:
                return SecurityResult(safe=False, violations=violations)
        except SyntaxError as e:
            return SecurityResult(safe=False, violation=f"Syntax error: {e}")

        return SecurityResult(safe=True)
```

### 9.3 Audit Trail

```python
class AgentAuditLog:
    """Comprehensive audit logging for agent actions"""

    async def log_action(
        self,
        task_id: int,
        agent_id: str,
        action: AgentAction,
        result: ActionResult
    ):
        entry = AuditEntry(
            timestamp=datetime.utcnow(),
            task_id=task_id,
            agent_id=agent_id,
            action_type=action.type,
            action_details=action.model_dump(),
            result_status=result.status,
            result_details=result.model_dump(),
            tokens_used=result.tokens_used,
            cost_incurred=result.cost,
            duration_ms=result.duration_ms
        )

        # Write to audit store
        await self.audit_store.write(entry)

        # Publish for real-time monitoring
        await self.dapr.publish("taskflow-pubsub", "audit.agent.action", entry)

    async def log_security_event(
        self,
        task_id: int,
        agent_id: str,
        event_type: str,
        details: dict
    ):
        entry = SecurityAuditEntry(
            timestamp=datetime.utcnow(),
            task_id=task_id,
            agent_id=agent_id,
            event_type=event_type,
            details=details,
            severity=self._get_severity(event_type)
        )

        await self.audit_store.write_security(entry)

        if entry.severity in ["HIGH", "CRITICAL"]:
            await self.alert_security_team(entry)
```

---

## 10. User Experience

### 10.1 Provider Connection UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings → AI Providers                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Connect your AI accounts to enable autonomous agents.           │
│  Your API keys are encrypted and never shared.                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ✓ Claude (Anthropic)                    [Manage] [Remove] ││
│  │    Connected Dec 15, 2025                                   ││
│  │    Usage this month: $12.34 (234K tokens)                   ││
│  │    Status: Active                                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ✓ Gemini (Google)                       [Manage] [Remove] ││
│  │    Connected Dec 10, 2025 via OAuth                         ││
│  │    Usage this month: $3.21 (890K tokens)                    ││
│  │    Status: Active (expires in 23 days)                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ○ GPT-4 (OpenAI)                        [Connect]         ││
│  │    Not connected                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ○ Qwen (Alibaba)                        [Connect]         ││
│  │    Not connected                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Budget Limits                                    [Edit]        │
│  ├── Per-task maximum: $5.00                                    │
│  ├── Daily maximum: $50.00                                      │
│  └── Monthly maximum: $500.00                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Task Assignment UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Assign Task: "Implement user authentication"                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │  Team Members           │  │  AI Agents                  │   │
│  │                         │  │                             │   │
│  │  ○ @mjunaid             │  │  ● @agent:claude-code       │   │
│  │  ○ @sarah               │  │    Provider: Claude         │   │
│  │  ○ @alex                │  │    Est. cost: ~$2-5         │   │
│  │                         │  │    Avg. completion: 25 min  │   │
│  │                         │  │                             │   │
│  │                         │  │  ○ @agent:gemini-code       │   │
│  │                         │  │    Provider: Gemini         │   │
│  │                         │  │    Est. cost: ~$1-3         │   │
│  │                         │  │                             │   │
│  │                         │  │  ○ @agent:gpt4-code         │   │
│  │                         │  │    ⚠ Not connected          │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
│                                                                  │
│  Execution Mode                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ● Yolo (Autonomous)                                         ││
│  │   Agent works independently until completion                 ││
│  │                                                              ││
│  │ ○ Supervised                                                 ││
│  │   Agent pauses for approval at each major step               ││
│  │                                                              ││
│  │ ○ Review Only                                                ││
│  │   Agent completes work, then requests review before apply    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Budget for this task: [$5.00        ] (org max: $10)           │
│                                                                  │
│                                    [Cancel]  [Assign & Start]   │
└─────────────────────────────────────────────────────────────────┘
```

### 10.3 Agent Progress View

```
┌─────────────────────────────────────────────────────────────────┐
│  Task #42: Implement user authentication                         │
│  Assigned to: @agent:claude-code                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Status: ● Running (45% complete)                               │
│  Runtime: 12:34 | Tokens: 45,231 | Cost: $1.23                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Live Activity                              [Pause] [Stop]  ││
│  │                                                              ││
│  │  12:34:21  Reading src/auth/models.py                       ││
│  │  12:34:45  Created subtask: "Add password hashing"          ││
│  │  12:35:02  Writing src/auth/password.py                     ││
│  │  12:35:34  Running tests: test_password.py                  ││
│  │  12:35:45  ✓ Tests passed (3/3)                             ││
│  │  12:36:01  Created subtask: "Add JWT tokens"                ││
│  │  12:36:15  Reading requirements for JWT library...          ││
│  │  █ Working...                                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Subtasks                                                        │
│  ├── ✓ Add password hashing (completed)                         │
│  ├── ● Add JWT tokens (in progress)                             │
│  ├── ○ Add login endpoint (pending)                             │
│  └── ○ Add registration endpoint (pending)                      │
│                                                                  │
│  Files Modified                                                  │
│  ├── src/auth/password.py (new)                                 │
│  ├── src/auth/models.py (modified)                              │
│  └── tests/test_password.py (new)                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Implementation Phases

### Phase 1: Provider Registry & BYOK (2 weeks)

**Goal**: Users can connect AI provider accounts

**Deliverables**:
- [ ] Provider credentials vault (encrypted storage)
- [ ] API key connection flow (Claude, OpenAI, Qwen)
- [ ] OAuth connection flow (Gemini)
- [ ] Key validation and testing
- [ ] Settings UI for provider management
- [ ] Usage tracking per provider

**Success Criteria**:
- User can connect Claude API key
- User can connect Gemini via OAuth
- Keys are encrypted at rest
- Connection status visible in settings

### Phase 2: Dapr Integration (2 weeks)

**Goal**: Event-driven task lifecycle

**Deliverables**:
- [ ] Dapr pub/sub configuration
- [ ] Task lifecycle events (assigned, started, completed, failed)
- [ ] Event handlers in API service
- [ ] Dapr Actors for agent state
- [ ] State persistence for checkpoints
- [ ] Integration with existing task system

**Success Criteria**:
- Task assignment publishes event
- Events flow through Dapr pub/sub
- Agent state persisted in Dapr state store

### Phase 3: Single-Agent Execution (3 weeks)

**Goal**: One agent can complete one task autonomously

**Deliverables**:
- [ ] Container spawning for agent execution
- [ ] Agent runtime image with MCP tools
- [ ] Unified provider client (Claude, Gemini, OpenAI)
- [ ] Basic execution loop
- [ ] Progress tracking and reporting
- [ ] Completion handling
- [ ] Error handling and retry logic
- [ ] Audit sidecar for logging

**Success Criteria**:
- Assign task to @agent:claude-code
- Agent spawns in container
- Agent completes simple coding task
- Progress visible in UI
- Audit trail captured

### Phase 4: Multi-Agent Orchestration (2 weeks)

**Goal**: Agents can create subtasks and delegate

**Deliverables**:
- [ ] Subtask creation by agents
- [ ] Agent-to-agent delegation
- [ ] Circular delegation prevention
- [ ] Delegation depth limits
- [ ] Progress rollup from subtasks
- [ ] Concurrent agent execution

**Success Criteria**:
- Agent can create subtask
- Agent can delegate to another agent
- Circular delegation blocked
- Parent task shows subtask progress

### Phase 5: Cost Controls & Guardrails (2 weeks)

**Goal**: Production-ready safety and cost management

**Deliverables**:
- [ ] Per-task cost limits
- [ ] Daily/monthly budget caps
- [ ] Loop detection and prevention
- [ ] Automatic pause at limits
- [ ] User notifications
- [ ] Admin override capabilities
- [ ] Usage dashboards and reports

**Success Criteria**:
- Task stops at cost limit
- User notified at 80% budget
- Infinite loop detected and stopped
- Usage visible in dashboard

### Phase 6: Security Hardening (2 weeks)

**Goal**: Enterprise-ready security

**Deliverables**:
- [ ] gVisor runtime for untrusted agents
- [ ] Network egress filtering
- [ ] Code execution sandboxing
- [ ] Security audit logging
- [ ] Penetration testing
- [ ] SOC2 compliance documentation

**Success Criteria**:
- Pass security audit
- No container escapes possible
- All egress filtered through proxy
- Comprehensive audit trail

---

## 12. Open Questions

### Product Questions
1. **Agent Marketplace**: Allow users to share custom agents publicly?
2. **Pricing Model**: Platform fee on top of BYOK costs?
3. **SLA for Agent Execution**: Guarantee completion times?
4. **Data Retention**: How long to keep agent execution logs?

### Technical Questions
1. **Workspace Persistence**: Ephemeral vs persistent workspaces?
2. **Multi-Region**: Deploy agents close to users?
3. **Offline Mode**: Can agents work without network?
4. **GPU Access**: Support for models requiring GPU?

### Security Questions
1. **Code Review for Custom Agents**: Manual review process?
2. **Credential Rotation**: Force rotation period?
3. **Incident Response**: Process for security breaches?

---

## 13. ADR References

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Agent Execution Isolation Strategy | Pending |
| ADR-002 | Event-Driven Architecture with Dapr | Pending |
| ADR-003 | Multi-Provider Credential Management | Pending |
| ADR-004 | Cost Control and Budgeting Model | Pending |

---

## Appendix A: API Reference

### Provider Endpoints

```
GET  /api/providers                    # List all providers and connection status
GET  /api/providers/{id}/connect       # Initiate connection flow
POST /api/providers/{id}/api-key       # Save API key
GET  /api/providers/{id}/callback      # OAuth callback
DELETE /api/providers/{id}             # Disconnect provider
GET  /api/providers/{id}/usage         # Get usage statistics
```

### Agent Endpoints

```
GET  /api/agents                       # List available agents
GET  /api/agents/{id}                  # Get agent details
POST /api/tasks/{id}/assign            # Assign task to agent
GET  /api/tasks/{id}/execution         # Get execution status
POST /api/tasks/{id}/execution/pause   # Pause execution
POST /api/tasks/{id}/execution/resume  # Resume execution
POST /api/tasks/{id}/execution/stop    # Stop execution
GET  /api/tasks/{id}/execution/logs    # Get execution logs
```

### Event Topics

```
task.assigned           # Task assigned to human or agent
agent.spawned           # Agent container created
agent.started           # Agent began execution
agent.progress          # Agent progress update
agent.subtask.created   # Agent created subtask
agent.tool.called       # Agent called MCP tool
agent.completed         # Agent finished successfully
agent.failed            # Agent encountered error
agent.paused            # Agent paused (limit/error)
review.requested        # Human review requested
review.completed        # Human review completed
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **BYOK** | Bring Your Own Key - users provide their own AI provider credentials |
| **Yolo Mode** | Fully autonomous execution without human checkpoints |
| **Trust Tier** | Classification of agent trustworthiness (trusted/verified/untrusted) |
| **Dapr Actor** | Stateful virtual actor for managing agent lifecycle |
| **Checkpoint** | Saved state allowing execution resume after failure |
| **Delegation** | Agent assigning subtask to another agent |
| **Egress Filtering** | Controlling outbound network traffic from containers |
