# Phase 1: Storage Specification

## Overview

Phase 1 uses local file storage for simplicity and portability. Data stored in JSON and YAML files that can be inspected, backed up, and version controlled.

## Storage Location

### Default: Project Local

```
./taskflow/           # Project root
└── .taskflow/        # TaskFlow data directory
    ├── config.yaml   # Configuration
    ├── data.json     # All data
    └── .env          # Secrets (gitignored)
```

### Alternative: Global

```
~/.taskflow/          # Home directory
├── config.yaml
├── data.json
└── .env
```

**Selection Logic:**
1. Check for `.taskflow/` in current directory
2. If not found and `--global` specified, use `~/.taskflow/`
3. If neither exists, `taskflow init` creates based on flag

## File Schemas

### config.yaml

```yaml
# TaskFlow Configuration
# Version: 1.0

version: "1.0"

# Identity
current_user: "@muhammad"

# Defaults
default_project: "taskflow"

# Display preferences
display:
  colors: true
  date_format: "%Y-%m-%d %H:%M"
  timezone: "local"  # or specific like "Asia/Karachi"

# Projects (stored here for quick access)
projects:
  - id: "taskflow"
    name: "TaskFlow Platform"
    description: "Human-Agent Task Orchestration"
    owner_id: "@muhammad"
    created_at: "2025-12-06T10:00:00Z"
  
  - id: "personal"
    name: "Personal Tasks"
    description: null
    owner_id: "@muhammad"
    created_at: "2025-12-06T10:00:00Z"

# Workers (stored here for quick access)
workers:
  - id: "@muhammad"
    type: "human"
    name: "Muhammad"
    agent_type: null
    capabilities: null
    created_at: "2025-12-06T10:00:00Z"
  
  - id: "@claude-code"
    type: "agent"
    name: "Claude Code"
    agent_type: "claude"
    capabilities:
      - coding
      - architecture
      - debugging
    created_at: "2025-12-06T10:00:00Z"
  
  - id: "@qwen"
    type: "agent"
    name: "Qwen"
    agent_type: "qwen"
    capabilities:
      - research
      - analysis
    created_at: "2025-12-06T10:00:00Z"
  
  - id: "@gemini"
    type: "agent"
    name: "Gemini"
    agent_type: "gemini"
    capabilities:
      - research
      - summarization
    created_at: "2025-12-06T10:00:00Z"
```

### data.json

```json
{
  "version": "1.0",
  "last_updated": "2025-12-06T14:30:00Z",
  
  "counters": {
    "task_id": 6,
    "audit_id": 15,
    "link_id": 2
  },
  
  "tasks": [
    {
      "id": 1,
      "title": "Implement MCP server",
      "description": "Build MCP server for agent connections",
      "project_id": "taskflow",
      "assignee_id": "@claude-code",
      "created_by_id": "@muhammad",
      "parent_task_id": null,
      "status": "in_progress",
      "progress": 60,
      "priority": "high",
      "tags": ["backend", "mcp"],
      "due_date": "2025-12-21T00:00:00Z",
      "created_at": "2025-12-06T10:00:00Z",
      "updated_at": "2025-12-06T14:30:00Z",
      "started_at": "2025-12-06T10:05:00Z",
      "completed_at": null
    },
    {
      "id": 2,
      "title": "Design protocol",
      "description": null,
      "project_id": "taskflow",
      "assignee_id": "@claude-code",
      "created_by_id": "@claude-code",
      "parent_task_id": 1,
      "status": "completed",
      "progress": 100,
      "priority": null,
      "tags": null,
      "due_date": null,
      "created_at": "2025-12-06T10:05:30Z",
      "updated_at": "2025-12-06T12:00:00Z",
      "started_at": "2025-12-06T10:10:00Z",
      "completed_at": "2025-12-06T12:00:00Z"
    }
  ],
  
  "audit_logs": [
    {
      "id": 1,
      "entity_type": "task",
      "entity_id": "1",
      "action": "created",
      "actor_id": "@muhammad",
      "actor_type": "human",
      "details": {
        "title": "Implement MCP server",
        "project": "taskflow"
      },
      "created_at": "2025-12-06T10:00:00Z"
    },
    {
      "id": 2,
      "entity_type": "task",
      "entity_id": "1",
      "action": "assigned",
      "actor_id": "@muhammad",
      "actor_type": "human",
      "details": {
        "assignee": "@claude-code"
      },
      "created_at": "2025-12-06T10:00:15Z"
    }
  ],
  
  "linked_resources": [
    {
      "id": 1,
      "owner_type": "task",
      "owner_id": "1",
      "resource_type": "spec",
      "resource_uri": "./specs/mcp-server.md",
      "name": "MCP Server Spec",
      "description": null,
      "access": "read",
      "created_by": "@muhammad",
      "created_at": "2025-12-06T10:01:00Z"
    }
  ],
  
  "blueprints": [
    {
      "id": "feature-dev",
      "name": "Feature Development",
      "description": "Standard pattern for new features",
      "template_tasks": [
        {
          "title": "Research existing solutions",
          "description": null,
          "default_assignee_type": "agent",
          "default_agent_type": "gemini",
          "order": 1
        },
        {
          "title": "Write specification",
          "description": null,
          "default_assignee_type": "human",
          "default_agent_type": null,
          "order": 2
        }
      ],
      "created_by": "@muhammad",
      "created_at": "2025-12-06T11:00:00Z"
    }
  ]
}
```

### .env

```bash
# TaskFlow Secrets
# DO NOT COMMIT THIS FILE

# Agent API Keys (for Phase 3+)
CLAUDE_API_KEY=sk-ant-...
QWEN_API_KEY=...
GEMINI_API_KEY=...

# Database (for Phase 2+)
NEON_DATABASE_URL=postgresql://...
```

## Storage Operations

### Initialization

```python
def init_storage(global_: bool = False) -> Path:
    """Initialize TaskFlow storage"""
    base_path = Path.home() / ".taskflow" if global_ else Path.cwd() / ".taskflow"
    
    if base_path.exists():
        raise TaskFlowError(f"TaskFlow already initialized at {base_path}")
    
    base_path.mkdir(parents=True)
    
    # Create config.yaml
    config = {
        "version": "1.0",
        "current_user": get_current_user(),  # From git or prompt
        "default_project": None,
        "display": {
            "colors": True,
            "date_format": "%Y-%m-%d %H:%M",
            "timezone": "local"
        },
        "projects": [],
        "workers": []
    }
    (base_path / "config.yaml").write_text(yaml.dump(config))
    
    # Create data.json
    data = {
        "version": "1.0",
        "last_updated": datetime.now().isoformat(),
        "counters": {"task_id": 0, "audit_id": 0, "link_id": 0},
        "tasks": [],
        "audit_logs": [],
        "linked_resources": [],
        "blueprints": []
    }
    (base_path / "data.json").write_text(json.dumps(data, indent=2))
    
    # Create .env template
    (base_path / ".env").write_text("# TaskFlow Secrets\n")
    
    # Create .gitignore
    (base_path / ".gitignore").write_text(".env\n")
    
    return base_path
```

### Loading

```python
def load_config() -> dict:
    """Load configuration from config.yaml"""
    config_path = find_config_path()
    if not config_path:
        raise TaskFlowError("TaskFlow not initialized. Run: taskflow init")
    return yaml.safe_load(config_path.read_text())

def load_data() -> dict:
    """Load data from data.json"""
    data_path = find_data_path()
    if not data_path:
        raise TaskFlowError("TaskFlow not initialized. Run: taskflow init")
    return json.loads(data_path.read_text())
```

### Saving

```python
def save_config(config: dict) -> None:
    """Save configuration to config.yaml"""
    config_path = find_config_path()
    config_path.write_text(yaml.dump(config, default_flow_style=False, sort_keys=False))

def save_data(data: dict) -> None:
    """Save data to data.json"""
    data["last_updated"] = datetime.now().isoformat()
    data_path = find_data_path()
    data_path.write_text(json.dumps(data, indent=2, default=str))
```

### ID Generation

```python
def get_next_id(data: dict, entity_type: str) -> int:
    """Get next auto-incrementing ID"""
    counter_key = f"{entity_type}_id"
    data["counters"][counter_key] += 1
    return data["counters"][counter_key]
```

### Finding Storage

```python
def find_taskflow_dir() -> Path | None:
    """Find .taskflow directory"""
    # Check current directory first
    local = Path.cwd() / ".taskflow"
    if local.exists():
        return local
    
    # Check home directory
    global_ = Path.home() / ".taskflow"
    if global_.exists():
        return global_
    
    return None

def find_config_path() -> Path | None:
    """Find config.yaml"""
    taskflow_dir = find_taskflow_dir()
    if taskflow_dir:
        return taskflow_dir / "config.yaml"
    return None

def find_data_path() -> Path | None:
    """Find data.json"""
    taskflow_dir = find_taskflow_dir()
    if taskflow_dir:
        return taskflow_dir / "data.json"
    return None
```

## Data Integrity

### Validation on Load

```python
def validate_data(data: dict) -> list[str]:
    """Validate data integrity, return list of errors"""
    errors = []
    
    # Check version compatibility
    if data.get("version") != "1.0":
        errors.append(f"Unsupported data version: {data.get('version')}")
    
    # Validate tasks
    task_ids = set()
    for task in data.get("tasks", []):
        # Check required fields
        if not task.get("id"):
            errors.append(f"Task missing id: {task}")
        if not task.get("title"):
            errors.append(f"Task {task.get('id')} missing title")
        if not task.get("project_id"):
            errors.append(f"Task {task.get('id')} missing project_id")
        
        # Check for duplicates
        if task.get("id") in task_ids:
            errors.append(f"Duplicate task id: {task.get('id')}")
        task_ids.add(task.get("id"))
        
        # Check parent exists
        if task.get("parent_task_id") and task["parent_task_id"] not in task_ids:
            # Parent might come later, check at end
            pass
    
    return errors
```

### Atomic Writes

```python
def atomic_save(path: Path, content: str) -> None:
    """Save file atomically using temp file + rename"""
    temp_path = path.with_suffix(".tmp")
    try:
        temp_path.write_text(content)
        temp_path.rename(path)
    except Exception:
        if temp_path.exists():
            temp_path.unlink()
        raise
```

### Backup on Modification

```python
def backup_before_save(path: Path) -> None:
    """Create backup before modifying"""
    if path.exists():
        backup_path = path.with_suffix(f".backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        shutil.copy(path, backup_path)
        
        # Keep only last 5 backups
        backups = sorted(path.parent.glob(f"{path.stem}.backup.*"))
        for old_backup in backups[:-5]:
            old_backup.unlink()
```

## Migration Path

### Phase 2 Migration

When moving to Neon PostgreSQL:

```python
def migrate_to_neon(connection_string: str) -> None:
    """Migrate local data to Neon database"""
    config = load_config()
    data = load_data()
    
    # Connect to Neon
    engine = create_engine(connection_string)
    
    # Create tables
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Migrate projects
        for proj in config["projects"]:
            session.add(Project(**proj))
        
        # Migrate workers
        for worker in config["workers"]:
            session.add(Worker(**worker))
        
        # Migrate tasks
        for task in data["tasks"]:
            session.add(Task(**task))
        
        # Migrate audit logs
        for log in data["audit_logs"]:
            session.add(AuditLog(**log))
        
        # Migrate linked resources
        for link in data["linked_resources"]:
            session.add(LinkedResource(**link))
        
        # Migrate blueprints
        for bp in data["blueprints"]:
            session.add(Blueprint(**bp))
        
        session.commit()
    
    # Update config to use neon
    config["storage"] = {
        "type": "neon",
        "connection_string": "${NEON_DATABASE_URL}"
    }
    save_config(config)
    
    print("✓ Migration complete. Storage: neon")
```

## File Locking

For concurrent access (rare in Phase 1, but prepared):

```python
import fcntl

@contextmanager
def locked_data():
    """Context manager for locked data access"""
    data_path = find_data_path()
    with open(data_path, "r+") as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        try:
            data = json.load(f)
            yield data
            f.seek(0)
            f.truncate()
            json.dump(data, f, indent=2, default=str)
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
```

## Error Handling

```python
class StorageError(TaskFlowError):
    """Base class for storage errors"""
    pass

class NotInitializedError(StorageError):
    """TaskFlow not initialized"""
    def __init__(self):
        super().__init__("TaskFlow not initialized. Run: taskflow init")

class CorruptedDataError(StorageError):
    """Data file corrupted"""
    def __init__(self, path: Path, errors: list[str]):
        super().__init__(f"Corrupted data in {path}:\n" + "\n".join(errors))

class MigrationError(StorageError):
    """Migration failed"""
    pass
```
