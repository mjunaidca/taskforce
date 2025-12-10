# Implementation Plan: Multi-Tenancy Project Isolation

**Feature**: `009-multi-tenancy`
**Created**: 2025-12-10
**Spec**: `/Users/mjs/Documents/code/mjunaidca/tf-agui/specs/009-multi-tenancy/spec.md`
**Status**: Ready for Implementation

---

## CONTEXT GATHERED

**Phase**: Phase II (Web Application - Multi-user with Better Auth)
**Feature**: Multi-tenancy project isolation with tenant_id scoping
**Audit Impact**: All project operations (create, list, get, update, delete) will include tenant context in audit entries
**Agent Parity**: Agents accessing projects via MCP server will be scoped to same tenant as their associated user
**Spec Location**: `/Users/mjs/Documents/code/mjunaidca/tf-agui/specs/009-multi-tenancy/spec.md`

---

## Constitutional Compliance

### 1. Audit Check ✅
All project operations will create audit entries with tenant context:
- Project creation: logs tenant_id in details
- Project queries: tenant filtering is transparent (logged via actor context)
- Cross-tenant access attempts: logged as failed access with attempted tenant
- Tenant context changes (dev mode): logged in audit trail

### 2. Agent Parity Check ✅
Multi-tenancy applies equally to agents:
- Agents authenticate with API keys → mapped to worker → worker's user → user's tenant
- MCP server tools respect same tenant boundaries as human API calls
- Agent project operations filtered by tenant context (same as humans)
- Future enhancement: tenant-scoped agents explicitly linked to organization

### 3. Recursive Check ✅
Tasks already support recursive decomposition (parent_task_id).
Multi-tenancy adds zero new constraints:
- Tasks inherit tenant through project relationship
- Subtasks automatically scoped to parent's tenant (same project)
- Agent-created subtasks respect tenant boundaries

### 4. Spec Check ✅
Spec exists at: `/Users/mjs/Documents/code/mjunaidca/tf-agui/specs/009-multi-tenancy/spec.md`

### 5. Phase Continuity Check ✅
Data model change designed for permanence:
- Phase II (Web): tenant_id column added to Project table
- Phase III (MCP): MCP tools inherit tenant filtering from API layer
- Phase IV (K8s): Multi-tenant deployment uses same data model
- Phase V (Production): Tenant isolation enables true SaaS multi-tenancy

---

## Architecture Overview

### Tenant Context Flow

```
Request → JWT/Header → get_tenant_id() → tenant_id (string)
                                             ↓
                          All Project Queries Filtered by tenant_id
                                             ↓
                          Audit Logs Include Tenant Context
```

### Tenant Extraction Priority

```python
def get_tenant_id(user: CurrentUser, request: Request) -> str:
    """Extract tenant context from request."""

    # Priority 1: JWT claim (production)
    if user.tenant_id:
        return user.tenant_id

    # Priority 2: X-Tenant-ID header (dev mode only)
    if settings.dev_mode:
        header_tenant = request.headers.get("X-Tenant-ID")
        if header_tenant and header_tenant.strip():
            return header_tenant.strip()

    # Priority 3: Default tenant (backward compatibility)
    return "taskflow"
```

### Database Changes

**Before (Global Slug Uniqueness)**:
```sql
CREATE TABLE project (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- Global constraint
    name VARCHAR(200) NOT NULL,
    ...
);
```

**After (Per-Tenant Slug Uniqueness)**:
```sql
CREATE TABLE project (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'taskflow',
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    ...
);

CREATE INDEX idx_project_tenant_id ON project(tenant_id);
CREATE UNIQUE INDEX idx_project_tenant_slug ON project(tenant_id, slug);
```

### Security Model

**Cross-Tenant Access Prevention**:
- Return 404 (not 403) for cross-tenant project access
- Prevents tenant enumeration attacks
- User cannot determine if project exists in another tenant
- Audit log records attempted access for security monitoring

---

## Technical Decisions

### Decision 1: Tenant ID Format

**Options Considered**:
1. Integer ID (auto-increment)
2. UUID (v4)
3. String identifier (kebab-case)

**Decision**: String identifier (VARCHAR(100), kebab-case validated)

**Rationale**:
- Aligns with SSO organization identifiers (Better Auth convention)
- Human-readable in logs and debugging
- Default "taskflow" is meaningful (not 0 or null)
- No JOIN required to tenant table (tenant is external concept)
- Easier to test (can use descriptive names in dev mode)

**Trade-offs**:
- Slightly larger storage than integer (acceptable overhead)
- String comparison in WHERE clause (mitigated by index)

---

### Decision 2: Tenant Storage Strategy

**Options Considered**:
1. Separate `tenant` table with project FK relationship
2. Embedded `tenant_id` string in project table (denormalized)

**Decision**: Embedded `tenant_id` string (denormalized)

**Rationale**:
- Tenant management happens in SSO (not TaskFlow responsibility)
- No need for tenant metadata (name, settings) in TaskFlow
- Simpler queries (no JOIN on every project fetch)
- Aligns with "tenant is a context, not an entity" principle
- Reduces query complexity and latency

**Trade-offs**:
- Cannot enforce referential integrity to tenant table (acceptable - SSO is source of truth)
- Tenant rename requires update across all projects (rare operation, can be handled via migration)

---

### Decision 3: Slug Uniqueness Constraint

**Options Considered**:
1. Global uniqueness (current): `UNIQUE(slug)`
2. Per-tenant uniqueness: `UNIQUE(tenant_id, slug)`
3. Hybrid: Global for default tenant, per-tenant for others

**Decision**: Per-tenant uniqueness `UNIQUE(tenant_id, slug)`

**Rationale**:
- Organizational autonomy (each tenant controls their namespace)
- Prevents cross-tenant naming conflicts
- Aligns with tenant isolation principle
- Simpler mental model (slug is unique within your organization)

**Implementation**:
```python
# Check slug uniqueness WITHIN tenant
stmt = select(Project).where(
    Project.tenant_id == tenant_id,
    Project.slug == data.slug
)
```

---

### Decision 4: Dev Mode Tenant Override

**Options Considered**:
1. Always honor X-Tenant-ID header (security risk)
2. Never honor header (testing friction)
3. Honor header only in dev mode (conditional based on settings.dev_mode)

**Decision**: Honor X-Tenant-ID header only when `settings.dev_mode = True`

**Rationale**:
- Enables local testing without JWT manipulation
- Zero security risk in production (header ignored)
- Explicit configuration flag prevents accidental bypass
- Developers can test tenant isolation with curl/Postman

**Implementation**:
```python
if settings.dev_mode:
    header_tenant = request.headers.get("X-Tenant-ID")
    if header_tenant:
        return header_tenant
```

---

### Decision 5: Audit Log Tenant Context

**Options Considered**:
1. Add tenant_id column to audit_log table (normalized)
2. Include tenant_id in audit details JSONB field (denormalized)
3. Derive tenant from project relationship when needed (lazy)

**Decision**: Include tenant_id in audit `details` JSONB field

**Rationale**:
- Audit log already has flexible `details` field for contextual data
- No schema migration required for audit table
- Tenant context is informational (not used for filtering audit logs)
- Audit queries are typically by entity_id/actor_id, not tenant
- Future-proof: if tenant-based audit filtering is needed, can add index on `(details->>'tenant_id')`

**Implementation**:
```python
await log_action(
    session,
    entity_type="project",
    entity_id=project_id,
    action="created",
    actor_id=worker_id,
    actor_type=worker_type,
    details={
        "slug": data.slug,
        "name": data.name,
        "tenant_id": tenant_id,  # Add tenant context
    },
)
```

---

### Decision 6: Task Tenant Scoping

**Options Considered**:
1. Add tenant_id to Task table (denormalized)
2. Derive tenant from Project relationship (normalized)

**Decision**: Derive tenant from Project relationship (no tenant_id in Task table)

**Rationale**:
- Tasks already have required FK to Project (`task.project_id`)
- Tenant isolation enforced at project boundary (tasks inherit)
- Reduces data duplication (single source of truth)
- Simpler data model (fewer fields to maintain)
- Task queries already JOIN project table (no performance penalty)

**Validation**:
```python
# Tasks automatically scoped by project tenant
stmt = select(Task).join(Project).where(
    Project.tenant_id == tenant_id,
    Task.project_id == project_id
)
```

---

## Component Breakdown

### Component 1: Data Model Changes

**Files Modified**:
- `packages/api/src/taskflow_api/models/project.py`

**Changes**:
```python
class Project(SQLModel, table=True):
    __tablename__ = "project"

    id: int | None = Field(default=None, primary_key=True)
    tenant_id: str = Field(
        default="taskflow",
        max_length=100,
        index=True,
        description="Organization/tenant identifier from SSO",
    )
    slug: str = Field(
        # REMOVE: unique=True (global uniqueness)
        index=True,  # Keep index for queries
        max_length=100,
        regex=r"^[a-z0-9-]+$",
        description="Unique project identifier within tenant",
    )
    # ... rest unchanged
```

**Database Migration**:
```sql
-- Add tenant_id column with default value
ALTER TABLE project
ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'taskflow';

-- Create index for tenant filtering
CREATE INDEX idx_project_tenant_id ON project(tenant_id);

-- Replace global slug uniqueness with per-tenant uniqueness
DROP INDEX IF EXISTS ix_project_slug;  -- Drop old global unique index
CREATE UNIQUE INDEX idx_project_tenant_slug ON project(tenant_id, slug);
```

**Acceptance Criteria**:
- [ ] tenant_id field added with default "taskflow"
- [ ] Index on tenant_id exists for query performance
- [ ] Composite unique index on (tenant_id, slug) exists
- [ ] Existing projects have tenant_id="taskflow" after migration
- [ ] No breaking changes to existing queries (backward compatible)

---

### Component 2: Tenant Context Extraction

**Files Modified**:
- `packages/api/src/taskflow_api/auth.py`

**New Function**:
```python
from fastapi import Request

def get_tenant_id(user: CurrentUser, request: Request | None = None) -> str:
    """Extract tenant context from JWT or request headers.

    Priority:
    1. JWT claim: tenant_id or organization_id
    2. X-Tenant-ID header (dev mode only)
    3. Default: "taskflow"

    Args:
        user: Authenticated user from JWT
        request: FastAPI request (for header access in dev mode)

    Returns:
        Tenant identifier string (never empty)
    """
    # Priority 1: JWT claim
    if user.tenant_id:
        tenant = user.tenant_id.strip()
        if tenant:
            logger.debug("[TENANT] Using JWT tenant_id: %s", tenant)
            return tenant

    # Priority 2: Dev mode header override
    if request and settings.dev_mode:
        header_tenant = request.headers.get("X-Tenant-ID", "").strip()
        if header_tenant:
            logger.debug("[TENANT] Using dev mode header: %s", header_tenant)
            return header_tenant

    # Priority 3: Default tenant
    logger.debug("[TENANT] Using default tenant: taskflow")
    return "taskflow"
```

**Update CurrentUser**:
```python
class CurrentUser:
    """Authenticated user extracted from JWT claims."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self.id: str = payload.get("sub", "")
        self.email: str = payload.get("email", "")
        self.name: str = payload.get("name", "")
        self.role: str = payload.get("role", "user")

        # Extract tenant from multiple possible JWT claims
        self.tenant_id: str | None = (
            payload.get("tenant_id") or
            payload.get("organization_id") or
            None
        )
```

**Acceptance Criteria**:
- [ ] get_tenant_id() function exists and is tested
- [ ] JWT tenant_id claim extracted (if present)
- [ ] JWT organization_id claim extracted as fallback
- [ ] X-Tenant-ID header honored in dev mode only
- [ ] Default "taskflow" returned when no tenant context exists
- [ ] Empty string tenant_id treated as missing (returns "taskflow")

---

### Component 3: Schema Updates

**Files Modified**:
- `packages/api/src/taskflow_api/schemas/project.py`

**Changes**:
```python
class ProjectRead(BaseModel):
    """Schema for project response."""

    id: int
    slug: str
    name: str
    description: str | None
    owner_id: str
    is_default: bool
    tenant_id: str  # NEW: Expose tenant for transparency
    member_count: int = 0
    task_count: int = 0
    created_at: datetime
    updated_at: datetime
```

**Acceptance Criteria**:
- [ ] tenant_id field added to ProjectRead schema
- [ ] API responses include tenant_id
- [ ] OpenAPI spec reflects new field
- [ ] ProjectCreate/ProjectUpdate schemas unchanged (tenant derived from context, not input)

---

### Component 4: Project Router - Tenant Filtering

**Files Modified**:
- `packages/api/src/taskflow_api/routers/projects.py`

**Changes Required**:

#### 4.1 List Projects Endpoint
```python
@router.get("", response_model=list[ProjectRead])
async def list_projects(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    request: Request,  # NEW: For get_tenant_id()
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ProjectRead]:
    """List projects where user is a member, scoped by tenant."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id

    # NEW: Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Get project IDs where user is a member AND project is in tenant
    member_stmt = (
        select(ProjectMember.project_id)
        .join(Project, ProjectMember.project_id == Project.id)
        .where(
            ProjectMember.worker_id == worker_id,
            Project.tenant_id == tenant_id,  # NEW: Tenant filter
        )
    )
    # ... rest of logic unchanged
```

#### 4.2 Create Project Endpoint
```python
@router.post("", response_model=ProjectRead, status_code=201)
async def create_project(
    data: ProjectCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    request: Request,  # NEW: For get_tenant_id()
) -> ProjectRead:
    """Create a new project in current tenant."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    # NEW: Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Check slug uniqueness WITHIN TENANT (not global)
    stmt = select(Project).where(
        Project.tenant_id == tenant_id,  # NEW: Tenant-scoped check
        Project.slug == data.slug
    )
    result = await session.exec(stmt)
    if result.first():
        raise HTTPException(
            status_code=400,
            detail=f"Project slug '{data.slug}' already exists in your organization"
        )

    # Create project with tenant
    project = Project(
        tenant_id=tenant_id,  # NEW: Set tenant
        slug=data.slug,
        name=data.name,
        description=data.description,
        owner_id=user.id,
        is_default=False,
    )
    # ... rest of logic unchanged, audit includes tenant_id in details
```

#### 4.3 Get Project Endpoint
```python
@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    request: Request,  # NEW: For get_tenant_id()
) -> ProjectRead:
    """Get project details (tenant-scoped, returns 404 for cross-tenant)."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id

    # NEW: Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Fetch project with tenant check
    stmt = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == tenant_id,  # NEW: Tenant filter
    )
    result = await session.exec(stmt)
    project = result.first()

    if not project:
        # Returns 404 for both "doesn't exist" and "wrong tenant"
        raise HTTPException(status_code=404, detail="Project not found")

    # Check membership (within tenant)
    # ... rest unchanged
```

#### 4.4 Update Project Endpoint
```python
@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    request: Request,  # NEW: For get_tenant_id()
) -> ProjectRead:
    """Update project (owner only, tenant-scoped)."""
    # NEW: Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Fetch project with tenant check
    stmt = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == tenant_id,  # NEW: Tenant filter
    )
    result = await session.exec(stmt)
    project = result.first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # ... rest unchanged
```

#### 4.5 Delete Project Endpoint
```python
@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    force: bool = Query(default=False),
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    request: Request,  # NEW: For get_tenant_id()
) -> dict:
    """Delete project (owner only, tenant-scoped)."""
    # NEW: Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Fetch project with tenant check
    stmt = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == tenant_id,  # NEW: Tenant filter
    )
    result = await session.exec(stmt)
    project = result.first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # ... rest unchanged
```

**Acceptance Criteria**:
- [ ] All project endpoints accept `request: Request` parameter
- [ ] All endpoints call `get_tenant_id(user, request)` to extract tenant
- [ ] All database queries filtered by `Project.tenant_id == tenant_id`
- [ ] Slug uniqueness checks scoped to tenant (not global)
- [ ] Cross-tenant access returns 404 (not 403)
- [ ] Audit logs include tenant_id in details field

---

### Component 5: Audit Log Integration

**Files Modified**:
- `packages/api/src/taskflow_api/routers/projects.py` (audit calls updated)

**Pattern for All Project Operations**:
```python
await log_action(
    session,
    entity_type="project",
    entity_id=project_id,
    action="created",  # or "updated", "deleted", etc.
    actor_id=worker_id,
    actor_type=worker_type,
    details={
        "slug": project.slug,
        "name": project.name,
        "tenant_id": tenant_id,  # NEW: Always include tenant context
        # ... other operation-specific details
    },
)
```

**Acceptance Criteria**:
- [ ] All project audit entries include tenant_id in details
- [ ] Tenant context logged for create, update, delete operations
- [ ] Failed cross-tenant access attempts logged (with attempted tenant)

---

## Implementation Sequence

### Phase 1: Foundation (No Breaking Changes)
**Estimated Time**: 30 minutes

**Order**:
1. **Data Model** (Component 1)
   - Add tenant_id field to Project model with default="taskflow"
   - Run database migration (column + indexes)
   - Verify existing projects have tenant_id="taskflow"

2. **Tenant Context Extraction** (Component 2)
   - Add get_tenant_id() function to auth.py
   - Update CurrentUser to extract tenant from JWT
   - Unit test tenant extraction logic

**Validation**:
```bash
# Run tests after Phase 1
uv run pytest tests/test_auth.py -k tenant
uv run pytest tests/test_models.py -k project
```

**Checkpoint**:
- [ ] Migration applied successfully
- [ ] All existing tests pass (zero breaking changes)
- [ ] get_tenant_id() returns "taskflow" for users without tenant claim

---

### Phase 2: Schema Updates (Read-Only)
**Estimated Time**: 15 minutes

**Order**:
1. **Schema Changes** (Component 3)
   - Add tenant_id to ProjectRead schema
   - Update API responses to include tenant_id
   - Verify OpenAPI spec updated

**Validation**:
```bash
# Start API server
uv run uvicorn main:app --reload

# Test API response includes tenant_id
curl -H "Authorization: Bearer $JWT" http://localhost:8000/api/projects

# Check OpenAPI spec
curl http://localhost:8000/openapi.json | jq '.components.schemas.ProjectRead'
```

**Checkpoint**:
- [ ] API responses include tenant_id field
- [ ] Existing projects return tenant_id="taskflow"
- [ ] No breaking changes (new field is additive)

---

### Phase 3: Tenant Filtering (Core Feature)
**Estimated Time**: 45 minutes

**Order**:
1. **List Projects** (Component 4.1)
   - Add request parameter to endpoint
   - Call get_tenant_id()
   - Filter projects by tenant_id
   - Update audit log

2. **Create Project** (Component 4.2)
   - Extract tenant context
   - Set project.tenant_id on creation
   - Update slug uniqueness check (tenant-scoped)
   - Update audit log with tenant_id

3. **Get Project** (Component 4.3)
   - Add tenant filter to query
   - Return 404 for cross-tenant access
   - Verify membership check works within tenant

4. **Update Project** (Component 4.4)
   - Add tenant filter to query
   - Return 404 for cross-tenant access

5. **Delete Project** (Component 4.5)
   - Add tenant filter to query
   - Return 404 for cross-tenant access

**Dependencies**:
- List → Independent (can be first)
- Create → Depends on List (for testing)
- Get/Update/Delete → Depend on Create (need multi-tenant test data)

**Validation After Each Endpoint**:
```bash
# Test dev mode tenant override
curl -H "X-Tenant-ID: acme-corp" -H "Authorization: Bearer $JWT" \
  http://localhost:8000/api/projects

# Test cross-tenant access returns 404
# (Create project in tenant A, try to access from tenant B)
```

**Checkpoint**:
- [ ] Projects filtered by tenant in all endpoints
- [ ] Slug uniqueness scoped to tenant (same slug works in different tenants)
- [ ] Cross-tenant access returns 404 (not 403)
- [ ] Dev mode X-Tenant-ID header works
- [ ] Production ignores X-Tenant-ID header

---

### Phase 4: Audit & Testing
**Estimated Time**: 30 minutes

**Order**:
1. **Audit Log Updates** (Component 5)
   - Verify all project operations include tenant_id in details
   - Test audit trail with multi-tenant operations

2. **Integration Tests**
   - Test P1 User Stories (spec scenarios 1-3)
   - Test edge cases (empty tenant, cross-tenant, dev mode)
   - Test backward compatibility (existing projects)

**Checkpoint**:
- [ ] All spec acceptance scenarios pass
- [ ] Edge cases handled correctly
- [ ] Audit logs include tenant context
- [ ] Test coverage ≥ 90% for tenant-related code

---

## Estimated Timeline

**Total: 2 hours (aligned with spec)**

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Foundation (Data Model + Tenant Extraction) | 30 min | 30 min |
| Phase 2: Schema Updates | 15 min | 45 min |
| Phase 3: Tenant Filtering (5 endpoints) | 45 min | 1h 30min |
| Phase 4: Audit & Testing | 30 min | 2h |

---

## Risk Analysis

### Risk 1: Cross-Tenant Data Leakage
**Likelihood**: Low
**Impact**: Critical
**Mitigation**:
- All queries explicitly filter by tenant_id
- Integration tests verify isolation
- Audit logs track cross-tenant access attempts
- Code review checklist includes tenant filtering verification

### Risk 2: Performance Degradation
**Likelihood**: Low
**Impact**: Medium
**Mitigation**:
- Index on tenant_id ensures fast filtering
- Query plan analysis before deployment
- Performance tests in CI/CD pipeline

### Risk 3: JWT Claim Missing (User Without Tenant)
**Likelihood**: High (expected for default users)
**Impact**: Low (by design)
**Mitigation**:
- Default tenant "taskflow" handles missing claims
- No user impact (backward compatible)
- Clear documentation for SSO configuration

---

## Deployment Checklist

### Pre-Deployment
- [ ] All unit tests pass (`uv run pytest`)
- [ ] Integration tests pass (multi-tenant scenarios)
- [ ] Performance tests show < 10% overhead
- [ ] Code review completed (focus on tenant filtering in ALL queries)
- [ ] Database migration script tested on staging
- [ ] Rollback plan documented and tested

### Deployment Steps
1. [ ] Run database migration (add tenant_id column + indexes)
2. [ ] Verify existing projects have tenant_id="taskflow"
3. [ ] Deploy API code
4. [ ] Run smoke tests (create/list/get projects)
5. [ ] Monitor for 404 errors (cross-tenant access attempts)
6. [ ] Monitor query performance (compare to baseline)

### Post-Deployment Validation
- [ ] Create project in dev mode with X-Tenant-ID → succeeds
- [ ] Create project without tenant claim → gets "taskflow"
- [ ] List projects from different tenants → properly isolated
- [ ] Cross-tenant access returns 404
- [ ] Audit logs include tenant_id
- [ ] API response includes tenant_id field

---

**End of Implementation Plan**

**Status**: Ready for implementation
**Next Step**: Begin Phase 1 (Foundation) - Data model + tenant extraction
