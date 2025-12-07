# ADR-001: CLI Framework and Data Architecture

- **Status:** Accepted
- **Date:** 2025-12-07
- **Feature:** 001-cli-core
- **Context:** specs/001-cli-core/spec.md

## Decision

Selected Typer + Pydantic + JSON file storage as the CLI foundation stack, with Rich for terminal output. This architecture provides type-safe command parsing, validated data models, and human-readable storage while maintaining forward compatibility with Phase II database migration.

**Technology Stack:**
- **CLI Framework**: Typer (over Click or argparse) - modern type hints, auto-generated help
- **Data Models**: Pydantic v2 with Python 3.13+ typing syntax
- **Storage**: JSON files in `.taskflow/` directory with file locking (fcntl)
- **Output**: Rich library for professional tables and color-coded status
- **Package Manager**: UV for fast dependency resolution

**Data Model Design:**
- Sequential integer IDs for tasks (not UUIDs) for CLI ergonomics
- Status transition validation via finite state machine (VALID_TRANSITIONS dict)
- Worker type validation with cross-field validators (agent_type required for agents)
- Parent-child relationships via `parent_id` for recursive task decomposition

## Consequences

### Positive
- Type hints enable auto-complete and IDE support for command arguments
- Pydantic → SQLModel migration requires minimal changes (same validators, field types)
- JSON storage is human-readable and debuggable during development
- Rich output provides professional UX without external dependencies
- File locking prevents data corruption from concurrent CLI instances

### Negative
- JSON file storage doesn't scale beyond ~10,000 tasks
- No indexing for complex queries (filtering done in-memory)
- File locking is Unix-specific (fcntl) - Windows requires different approach
- Sequential IDs leak information about task volume

## Alternatives Considered

### Alternative A: Click + SQLite
- Pros: Mature library, built-in database with indexing, works offline
- Cons: More boilerplate, SQLite adds complexity for simple Phase I, Click lacks modern type hints
- Why rejected: Typer provides better DX with less code; JSON storage is simpler for rapid prototyping

### Alternative B: argparse + YAML
- Pros: Zero external dependencies, human-readable config format
- Cons: No type safety, verbose argument definitions, YAML has footguns (Norway problem)
- Why rejected: Typer's type-first design catches errors at definition time, not runtime

### Alternative C: Fire + JSON
- Pros: Zero configuration, automatic CLI from class methods
- Cons: Less control over argument parsing, limited customization, implicit behavior
- Why rejected: TaskFlow needs explicit control over command structure for UX consistency

## References
- Spec: specs/001-cli-core/spec.md
- Plan: specs/001-cli-core/plan.md
- Implementation: packages/cli/src/taskflow/
- Key files: packages/cli/src/taskflow/models.py, packages/cli/src/taskflow/storage.py
