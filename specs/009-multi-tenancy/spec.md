# Feature Specification: Multi-Tenancy Project Isolation

**Feature Branch**: `009-multi-tenancy`
**Created**: 2025-12-10
**Status**: Draft
**Input**: User description: "Add tenant_id scoping to the TaskFlow API so projects are isolated by organization. Use a default tenant ('taskflow') for all users to avoid SSO changes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Project Isolation by Tenant (Priority: P1)

As an organization administrator, I want all projects created by users in my organization to be automatically scoped to my organization's tenant, so that our data remains isolated from other organizations.

**Why this priority**: Core multi-tenancy requirement. Without tenant isolation, organizations cannot trust that their task data is private. This is the foundational security boundary that enables enterprise adoption.

**Independent Test**: Can be fully tested by creating projects under different tenant contexts and verifying they cannot see each other's data. Delivers secure organizational boundaries.

**Acceptance Scenarios**:

1. **Given** a user authenticated with tenant "acme-corp", **When** they create a project "quarterly-goals", **Then** the project is stored with tenant_id "acme-corp"
2. **Given** a user authenticated with tenant "acme-corp", **When** they list projects, **Then** they only see projects belonging to "acme-corp"
3. **Given** a user authenticated with tenant "acme-corp", **When** they try to access a project belonging to tenant "other-corp" by ID, **Then** they receive a 404 Not Found (not 403 Forbidden, to avoid leaking existence)

---

### User Story 2 - Default Tenant for Existing Users (Priority: P1)

As an existing TaskFlow user without a tenant assignment, I want my projects to be automatically assigned to the default "taskflow" tenant, so that my data remains accessible without requiring any SSO reconfiguration.

**Why this priority**: Essential for backward compatibility. Existing users and sessions must continue working seamlessly without migration disruption.

**Independent Test**: Can be tested by authenticating without a tenant_id claim and verifying all operations use "taskflow" as the default tenant.

**Acceptance Scenarios**:

1. **Given** a user's JWT has no tenant_id claim, **When** they create a project, **Then** the project is created with tenant_id "taskflow-default-org-id"
2. **Given** an existing project was created before multi-tenancy, **When** a user queries for it, **Then** it is accessible under the default "taskflow-default-org-id" tenant
3. **Given** a user's JWT has no tenant_id claim, **When** they list projects, **Then** they see only projects with tenant_id "taskflow-default-org-id"

---

### User Story 3 - Unique Project Slugs Per Tenant (Priority: P2)

As a tenant user, I want to use the same project slug (e.g., "my-project") that another tenant might be using, so that each tenant has complete autonomy over their project naming.

**Why this priority**: Important for user experience but not a security blocker. Different organizations should not have naming conflicts.

**Independent Test**: Can be tested by creating projects with identical slugs in different tenants and verifying both succeed.

**Acceptance Scenarios**:

1. **Given** tenant "acme-corp" has a project with slug "roadmap", **When** tenant "beta-inc" creates a project with slug "roadmap", **Then** the creation succeeds
2. **Given** tenant "acme-corp" has a project with slug "roadmap", **When** a user in tenant "acme-corp" tries to create another project with slug "roadmap", **Then** they receive a 400 error indicating slug already exists

---

### User Story 4 - Dev Mode Tenant Override (Priority: P3)

As a developer testing the multi-tenancy feature locally, I want to override my tenant context using a request header, so that I can test tenant isolation without modifying JWT claims.

**Why this priority**: Developer tooling for testing. Not user-facing but critical for QA and development workflow.

**Independent Test**: Can be tested by setting X-Tenant-ID header in dev mode and verifying requests are scoped accordingly.

**Acceptance Scenarios**:

1. **Given** the API is running in dev mode, **When** a request includes header "X-Tenant-ID: test-tenant", **Then** the request is scoped to tenant "test-tenant"
2. **Given** the API is running in production mode, **When** a request includes header "X-Tenant-ID: test-tenant", **Then** the header is ignored and JWT tenant is used

---

### Edge Cases

- What happens when a project exists but belongs to a different tenant? → Return 404 (not 403) to avoid leaking existence
- How does the system handle users with tenant_id in JWT vs. users without? → Users without tenant_id default to "taskflow"
- What happens to audit log queries when filtering by project? → Audit entries inherit tenant scoping through the project relationship
- How are existing database rows handled? → Default value "taskflow" applied automatically via SQLModel default
- What if X-Tenant-ID header is set in production? → Ignored; only JWT claim is authoritative in production
- What if tenant_id is an empty string in JWT? → Treated as missing; falls back to "taskflow"

---

## Access Model: Tenant vs Project Membership

### Two-Level Access Control (Principle of Least Privilege)

This implementation uses a **two-level access model**:

```
Level 1: TENANT (Namespace)
    └── Defines which projects EXIST in your organizational boundary
    └── Users only see projects within their tenant

Level 2: PROJECT MEMBERSHIP (Access)
    └── Defines which projects you can actually ACCESS
    └── Must be explicitly added to a project by its owner
```

### How It Works

**Scenario: 3 users in the same organization "acme-corp"**

```
Organization: acme-corp (tenant_id = "acme-corp")
Users: Alice, Bob, Charlie (all have JWT with tenant_id = "acme-corp")

1. Alice signs up and creates "Project Alpha"
   → Project Alpha: tenant_id="acme-corp", owner_id=Alice
   → Alice is automatically a member (role: owner)

2. Bob signs up (same org) and calls GET /api/projects
   → Query filters: tenant_id="acme-corp" AND user is member
   → Result: [] empty - Bob is in the org but NOT a member of any project

3. Bob creates "Project Beta"
   → Project Beta: tenant_id="acme-corp", owner_id=Bob
   → Bob is automatically a member (role: owner)

4. Alice invites Bob to Project Alpha
   → POST /api/projects/{alpha_id}/members with user_id=Bob
   → Bob is now a member of Project Alpha

5. Bob calls GET /api/projects
   → Result: [Project Alpha, Project Beta] - Bob can see both now
```

### Access Matrix

| Action | Same Tenant, Not Member | Same Tenant, Member | Different Tenant |
|--------|------------------------|---------------------|------------------|
| List projects | Not visible | ✅ Visible | Not visible |
| View project | 404 | ✅ Allowed | 404 |
| Create project | ✅ Creates in own tenant | ✅ Creates in own tenant | N/A |
| Add members | 403 (not owner) | ✅ If owner | 404 |
| View tasks | 403 | ✅ Allowed | 404 |

### Why This Model?

1. **Least Privilege**: Being in an org doesn't auto-grant access to all org projects
2. **Flexibility**: Teams within an org can have separate projects
3. **Security**: Sensitive projects stay private even within org
4. **Collaboration**: Owners explicitly invite collaborators

### User Workflow

```
New User Joins Organization:
1. User signs up / gets added to org in SSO
2. User's JWT includes tenant_id = "org-id"
3. User can create their OWN projects (becomes owner)
4. User sees ONLY projects they own or were invited to
5. Project owners invite them to collaborate on existing projects
```

### Future Considerations (Not In Scope)

- **Org-wide visibility**: Auto-share all projects with org members
- **Role-based access**: Admin role sees all org projects
- **Project templates**: Pre-configured membership for new projects

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add a `tenant_id` field to the Project model with default value "taskflow-default-org-id"
- **FR-002**: System MUST create a database index on `tenant_id` for efficient filtering
- **FR-003**: System MUST filter all project queries by the current user's tenant context
- **FR-004**: System MUST extract tenant context in this priority order: (1) JWT claim `tenant_id` or `organization_id`, (2) X-Tenant-ID header in dev mode only, (3) default "taskflow-default-org-id"
- **FR-005**: System MUST return 404 (not 403) when a user attempts to access a project belonging to another tenant
- **FR-006**: System MUST enforce project slug uniqueness within a tenant, not globally
- **FR-007**: System MUST set tenant_id when creating new projects from the current user's tenant context
- **FR-008**: System MUST include tenant_id in the project read response for transparency
- **FR-009**: System MUST validate tenant_id is never empty or null - always fallback to "taskflow-default-org-id"
- **FR-010**: System MUST create audit log entries that include tenant context for all project operations

### Key Entities

- **Project**: Extended with `tenant_id` field (string, indexed, default "taskflow-default-org-id"). Represents the organizational boundary for data isolation. Slug uniqueness constraint changes from global to per-tenant.
- **Tenant**: Implicit entity represented by string identifier. No separate tenant table required - tenant_id comes from JWT claims. Default tenant "taskflow-default-org-id" exists for backward compatibility.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users cannot see or access projects belonging to other tenants under any circumstances (100% isolation)
- **SC-002**: Existing projects and users continue to work without any migration steps (zero breaking changes)
- **SC-003**: Project queries with tenant filtering perform within 10% of pre-multi-tenancy baseline (no significant performance degradation)
- **SC-004**: Developers can switch tenant contexts in dev mode without modifying authentication
- **SC-005**: All project CRUD operations create proper audit entries with tenant context

## Constraints

- **C-001**: No SSO/authentication changes required - tenant context extracted from existing JWT claims
- **C-002**: No database migration script required for existing data - default value handles backfill
- **C-003**: No breaking changes to API contracts - tenant_id is added as a new field, not replacing existing fields
- **C-004**: Tenant context is request-scoped, not global - each request independently determines its tenant

## Non-Goals

- **NG-001**: Tenant management CRUD (creating, listing, deleting tenants) - tenants are managed in SSO, not TaskFlow
- **NG-002**: Cross-tenant data sharing or transfer - projects belong to exactly one tenant permanently
- **NG-003**: Tenant-specific configuration or settings - all tenants share the same application configuration
- **NG-004**: Billing or usage quotas per tenant - not in scope for this feature
- **NG-005**: Tenant-scoped workers/members - workers are user-scoped, not tenant-scoped (may be future enhancement)

## Assumptions

- **A-001**: Better Auth JWT can be extended to include tenant_id claim when organizations are configured
- **A-002**: Single-tenant deployments are the majority use case; multi-tenant is opt-in via JWT claims
- **A-003**: Tenant IDs are stable identifiers that do not change after project creation
- **A-004**: The "taskflow-default-org-id" default tenant is reserved and cannot be used as a custom organization identifier
