# Feature Specification: Organizations UI - Multi-Tenant Management Interface

**Feature Branch**: `009-organizations-ui`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "Complete Organizations UI implementation with member management, invitations, RBAC, and multi-tenant support"

## Executive Summary

This specification defines the complete user interface layer for Better Auth's Organizations plugin, enabling multi-tenant workspace management for Taskflow SSO. The backend infrastructure (database schema, JWT claims, organization plugin) is 60% complete. This feature focuses on building the missing UI components and workflows to expose organization capabilities to end users.

**Current State**: Backend ready (tables, JWT claims, auto-join), zero UI
**Target State**: Full-featured organization management with dashboard, invitations, member management, RBAC, and admin tools

## Success Evals (Defined First)

**These measurable outcomes guide the specification below. Implementation success is validated against these criteria.**

- **Eval-1**: 85%+ of users successfully create their first organization in <60 seconds without validation errors (tracked via analytics)
- **Eval-2**: 80%+ of invited users accept invitations within 24 hours of receiving email (baseline: measure acceptance lag time)
- **Eval-3**: Organization switching completes in <2 seconds for 95%+ of operations (measured from click to JWT token update)
- **Eval-4**: Zero XSS vulnerabilities in organization name/slug/description inputs (validated by automated security scan before launch)
- **Eval-5**: Admin bulk operations on 100 organizations complete in <30 seconds or provide async progress indicator
- **Eval-6**: Member list with 100 members loads and renders in <1 second (paginated, 50 per page)
- **Eval-7**: Invitation email delivery rate >95% within 5 minutes of sending (tracked via email service metrics)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organization Discovery & Switching (Priority: P1)

**Description**: As a user who belongs to multiple organizations (e.g., personal projects at Panaversity and work projects at mjunaidca), I need to view all my organizations, see my role in each, and switch between them to access organization-specific resources.

**Why this priority**: Core multi-tenancy foundation. Without this, users cannot leverage the existing backend organization support. This is the entry point for all organization features.

**Independent Test**: User can navigate to `/account/organizations`, see list of organizations they belong to (with role badges), click "Switch" on any organization, and verify the active organization updates (confirmed by JWT token `tenant_id` claim change).

**Acceptance Scenarios**:

1. **Given** I'm signed in and belong to 3 organizations, **When** I visit `/account/organizations`, **Then** I see 3 organization cards showing name, member count, my role, and active status
2. **Given** I'm viewing my organizations list, **When** I click "Switch" on a non-active organization, **Then** my session updates, the organization becomes active (badge changes), and JWT `tenant_id` reflects new active org
3. **Given** I belong to only the default "Taskflow" organization, **When** I visit `/account/organizations`, **Then** I see one organization card marked as active with "Default" badge
4. **Given** I'm on organization dashboard, **When** I switch organizations, **Then** connected OAuth clients (RoboLearn, AI Native) receive updated `tenant_id` in next token refresh

### Edge Cases
- User belongs to zero organizations (should never happen due to auto-join, but handle gracefully with "Join Organization" prompt)
- Switching fails due to network error (show error, keep current org active)
- User tries to switch while OAuth authorization is in progress (warn about interrupting auth flow)

---

### User Story 2 - Create New Organization (Priority: P1)

**Description**: As a user who wants to separate work contexts (e.g., create "Panaversity AI Lab" organization separate from personal projects), I need to create a new organization with a name, slug, and optional logo.

**Why this priority**: Critical for multi-tenancy adoption. Users must be able to create organizations to invite team members and collaborate. Without this, organizations remain limited to the default one.

**Independent Test**: User clicks "Create Organization" button, fills form (name: "AI Lab", slug: "ai-lab", uploads logo), submits, and verifies new organization appears in their list with "Owner" role.

**Acceptance Scenarios**:

1. **Given** I'm on organizations dashboard, **When** I click "+ Create Organization", **Then** a modal opens with form fields (name, slug, logo upload, description)
2. **Given** I'm filling organization creation form, **When** I enter name "AI Lab", **Then** slug auto-suggests "ai-lab" (lowercase, hyphenated)
3. **Given** I submit valid organization form, **When** creation succeeds, **Then** I'm redirected to new organization's settings page, marked as owner, and organization appears in my list
4. **Given** I try to create organization with existing slug, **When** I submit form, **Then** I see error "Slug 'ai-lab' already exists, please choose another"
5. **Given** organization creation fails (network error), **When** I retry, **Then** form data persists (no need to re-enter)

### Edge Cases
- Slug contains special characters (auto-sanitize to lowercase alphanumeric + hyphens)
- User uploads 10MB logo (validate max size 2MB, show error)
- User leaves slug empty (auto-generate from name)
- Duplicate organization name (allowed, but slug must be unique)
- Creation during maintenance mode (show "Service temporarily unavailable")

---

### User Story 3 - Invite Team Members (Priority: P2)

**Description**: As an organization owner/admin, I need to invite colleagues to join my organization via email, assign them a role (owner/admin/member), and track invitation status.

**Why this priority**: Team collaboration enabler. Once organizations exist, inviting members is the next critical step. Lower than P1 because solo users can still create/use organizations.

**Independent Test**: Owner navigates to organization settings → Members tab → "Invite Member", enters email `colleague@example.com`, selects role "admin", sends invitation. Invitation appears in "Pending" list. Invitee receives email with accept link.

**Acceptance Scenarios**:

1. **Given** I'm an owner/admin in "AI Lab" organization, **When** I click "Invite Member" in settings, **Then** modal opens with fields (email, role dropdown: owner/admin/member)
2. **Given** I invite `sarah@example.com` as "admin", **When** invitation sends successfully, **Then** Sarah receives email with invitation link valid for 48 hours
3. **Given** Sarah clicks invitation link, **When** she's already signed in, **Then** she sees "Accept Invitation to AI Lab" page with organization details and "Accept"/"Decline" buttons
4. **Given** Sarah accepts invitation, **When** she confirms, **Then** she's added to organization with "admin" role, sees success message, and organization appears in her list
5. **Given** invitation expires (48 hours), **When** Sarah clicks link, **Then** she sees "Invitation expired, contact organization owner" message

### Edge Cases
- Invite user who's already a member (show error "User already belongs to this organization")
- Invite non-existent email (allowed - user must sign up first, then accept)
- Member tries to invite others (only owners/admins can invite - permission check)
- Send 10 invitations in 1 minute (rate limit: max 5 invitations per hour per organization)
- Invitation email fails to send (log error, mark invitation as "pending email", allow manual resend)
- User declines invitation (remove invitation record, notify inviter)

---

### User Story 4 - Manage Organization Members (Priority: P2)

**Description**: As an organization owner/admin, I need to view all members, change their roles, and remove members who should no longer have access.

**Why this priority**: Essential for organization governance. Complements invitation system. Together they form complete member lifecycle management.

**Independent Test**: Navigate to organization settings → Members tab, see member list (3 members), click role dropdown for "Sarah Johnson" (currently "member"), select "admin", confirm change. Refresh page, Sarah's role shows "admin".

**Acceptance Scenarios**:

1. **Given** I'm viewing members tab in "AI Lab" settings, **When** page loads, **Then** I see table with columns (Name, Email, Role, Joined Date, Actions)
2. **Given** I click role dropdown for member "John Doe", **When** I select "admin" (from "member"), **Then** confirmation dialog asks "Change John's role to admin?", I confirm, role updates
3. **Given** I'm an owner, **When** I try to change another owner's role, **Then** I see error "Cannot modify owner roles" (only owner can demote themselves)
4. **Given** I click "Remove" for member "Jane Smith", **When** I confirm removal dialog, **Then** Jane is removed from organization, no longer sees org in her list, loses access to org resources
5. **Given** I'm the only owner, **When** I try to leave organization, **Then** I see error "Cannot leave organization - you're the only owner. Transfer ownership first."

### Edge Cases
- Remove member who owns resources (show warning: "Member owns X resources, reassign first?" with optional force removal)
- Change role while member is actively using system (role updates immediately, next request uses new permissions)
- Member list with 1000+ members (paginate, show 50 per page, add search/filter)
- Remove member who has pending invitations they sent (cancel invitations on removal)
- Owner demotes self to member (only if another owner exists - prevent lockout)

---

### User Story 5 - Organization Settings Management (Priority: P3)

**Description**: As an organization owner/admin, I need to update organization details (name, slug, logo, description, metadata) and manage advanced settings (delete organization, transfer ownership).

**Why this priority**: Important for organization branding and lifecycle management, but not blocking for core multi-tenancy workflows. Can be added after member management is stable.

**Independent Test**: Navigate to organization settings → General tab, change name from "AI Lab" to "Panaversity AI Lab", update logo, save changes. Refresh organization dashboard, verify new name and logo display.

**Acceptance Scenarios**:

1. **Given** I'm in organization settings, **When** I update name to "Panaversity AI Research", **Then** name updates across all UI (dashboard, member emails, OAuth consent screens)
2. **Given** I change organization slug from "ai-lab" to "panaversity-ai", **When** I save, **Then** slug updates, old slug redirects to new slug for 30 days (avoid breaking bookmarks)
3. **Given** I upload new 500KB PNG logo, **When** upload completes, **Then** logo displays in organization card, settings page, and OAuth consent screen
4. **Given** I'm in Danger Zone section, **When** I click "Delete Organization", **Then** confirmation dialog requires typing organization name to confirm, warns about permanent data loss
5. **Given** I delete organization with 50 members, **When** I confirm, **Then** all members are removed, organization-scoped resources are deleted/archived, operation completes with success message

### Edge Cases
- Change slug to existing slug (validation error before save)
- Delete organization while OAuth authorization is active (cancel active authorizations, notify affected clients)
- Transfer ownership to member who declined invitation (only allow transfer to active members)
- Update settings with network interruption (optimistic UI update, rollback on error)
- Organization with 10,000+ members (delete operation runs async, show progress bar)

---

### User Story 6 - Admin Organization Oversight (Priority: P3)

**Description**: As a platform administrator (Taskflow SSO admin), I need to view all organizations across the platform, see usage stats (member count, created date, activity), and perform bulk operations (disable, transfer, delete) for moderation.

**Why this priority**: Administrative tooling for platform governance. Critical for production systems but not needed for MVP. Lower priority than user-facing organization features.

**Independent Test**: Sign in as admin, navigate to `/admin/organizations`, see table with all organizations (100+ orgs), filter by "active orgs with >10 members", select 3 orgs, click "Bulk Disable", confirm, verify orgs are disabled.

**Acceptance Scenarios**:

1. **Given** I'm signed in as admin, **When** I visit `/admin/organizations`, **Then** I see paginated table (50/page) with columns (Name, Slug, Members, Owner, Created, Status, Actions)
2. **Given** I'm viewing admin org list, **When** I search "panaversity", **Then** table filters to orgs matching name/slug containing "panaversity"
3. **Given** I select 5 organizations, **When** I click "Bulk Disable", **Then** confirmation asks "Disable 5 organizations? Members will lose access", I confirm, orgs disabled
4. **Given** I click "View Details" on "AI Lab" organization, **When** modal opens, **Then** I see full org details (metadata, member list, invitation history, activity log, OAuth clients using this org)
5. **Given** organization has GDPR deletion request, **When** I click "Delete with Audit", **Then** org and all data deleted, audit log entry created with admin user, timestamp, reason

### Edge Cases
- Search with no results (show "No organizations found" with create organization suggestion)
- Bulk operation on 1000+ organizations (run async job, show progress, email admin when complete)
- Disable organization while members are actively authenticated (existing sessions remain valid until expiry, new logins blocked)
- Admin is also member of organization being managed (show warning "You're a member of this org")
- Organization with no owner (orphaned org - show "Transfer Ownership" as required action before other operations)

---

### User Story 7 - Profile Page Organization Integration (Priority: P3)

**Description**: As a user managing multiple profiles (personal vs work), I want my profile page to show my current active organization and provide quick access to switch organizations or view all organizations.

**Why this priority**: Improves UX by surfacing organization context in profile settings. Nice-to-have enhancement, not blocking for core org workflows.

**Independent Test**: Navigate to `/account/profile`, see "Active Organization" section showing "Panaversity AI Lab" with "Owner" badge, click "Switch Organization" link, redirects to organizations dashboard.

**Acceptance Scenarios**:

1. **Given** I'm on profile page, **When** page loads, **Then** I see "Active Organization" section between personal details and work profile
2. **Given** active org is "AI Lab", **When** section displays, **Then** I see organization name, logo thumbnail, my role badge ("Owner"), member count, and "View All Organizations" link
3. **Given** I click "Switch Organization" in profile, **When** I select different org from dropdown, **Then** active org updates without page reload, JWT refreshes, connected apps reflect change
4. **Given** I belong to 1 organization (default), **When** profile loads, **Then** "Active Organization" section shows default org with info badge "Default workspace"

### Edge Cases
- Switching orgs while form has unsaved changes (show warning "Unsaved changes will be lost")
- Organization deleted while viewing profile (show "Organization no longer exists" with fallback to default org)
- Dropdown with 50+ organizations (add search filter within dropdown)

---

## Requirements *(mandatory)*

### Functional Requirements

#### Organization Discovery & Management
- **FR-001**: System MUST display all organizations user belongs to with name, slug, logo, member count, user's role, and active status
- **FR-002**: System MUST allow users to switch active organization, updating session `activeOrganizationId` and JWT `tenant_id` claim
- **FR-003**: System MUST allow users to create new organizations with name (required), slug (required, unique), logo (optional, max 2MB), description (optional), and metadata (optional JSON)
- **FR-004**: System MUST auto-generate URL-safe slug from organization name if user doesn't provide one (lowercase, alphanumeric, hyphens only)
- **FR-005**: System MUST assign creating user as organization "owner" role upon creation

#### Invitation System
- **FR-006**: System MUST allow organization owners and admins to invite users via email with role assignment (owner/admin/member)
- **FR-007**: System MUST send invitation email containing secure invitation link with expiry (48 hours)
- **FR-008**: System MUST provide invitation acceptance page displaying organization details, inviter name, assigned role, and accept/decline actions
- **FR-009**: System MUST add user to organization with assigned role upon invitation acceptance
- **FR-010**: System MUST allow inviter to cancel pending invitations
- **FR-011**: System MUST allow inviter to resend invitation emails for pending invitations
- **FR-012**: System MUST expire invitations after 48 hours, rendering acceptance link invalid

#### Member Management
- **FR-013**: System MUST display paginated member list (50 per page) with name, email, role, joined date, and actions
- **FR-014**: System MUST allow organization owners and admins to change member roles (owner/admin/member) with confirmation dialog
- **FR-015**: System MUST allow organization owners and admins to remove members from organization
- **FR-016**: System MUST allow members to leave organization voluntarily (except sole owner)
- **FR-017**: System MUST prevent organization from having zero owners (require owner transfer before last owner can leave/be demoted)
- **FR-018**: System MUST support member search and filtering by name, email, or role

#### Organization Settings
- **FR-019**: System MUST allow organization owners and admins to update organization name, slug, logo, description, and metadata
- **FR-020**: System MUST validate slug uniqueness across all organizations before allowing slug changes
- **FR-021**: System MUST redirect old slug to new slug for 30 days when slug changes (avoid breaking bookmarks/links)
- **FR-022**: System MUST allow organization owners to delete organization with confirmation (requires typing org name)
- **FR-023**: System MUST allow organization owners to transfer ownership to another member
- **FR-024**: System MUST remove all members, archive resources, and delete organization data upon organization deletion

#### Admin Panel
- **FR-025**: System MUST provide admin-only organization list with search, filter, sort, and pagination
- **FR-026**: System MUST allow admins to view detailed organization information (members, invitations, activity, OAuth clients)
- **FR-027**: System MUST allow admins to perform bulk operations (disable, enable, delete) on selected organizations
- **FR-028**: System MUST log all admin organization operations in audit trail with admin user, timestamp, action, and reason

#### Profile Integration
- **FR-029**: System MUST display active organization in user profile page with name, logo, role, and member count
- **FR-030**: System MUST provide quick organization switcher in profile page

#### Access Control & Permissions
- **FR-031**: System MUST enforce role-based permissions: owners have full control, admins can manage members/settings (except delete org), members have read-only access
- **FR-032**: System MUST hide invitation and member management features from users without owner/admin role
- **FR-033**: System MUST validate organization ownership/admin role before processing sensitive operations (invite, remove, role change, delete)

#### Security & Validation
- **FR-034**: System MUST rate limit invitation sending to 5 invitations per hour per organization
- **FR-035**: System MUST validate email format before sending invitations
- **FR-036**: System MUST prevent inviting users who are already organization members
- **FR-037**: System MUST validate image uploads (type: PNG/JPG/GIF, max size: 2MB, dimensions: max 2000x2000px)
- **FR-038**: System MUST sanitize organization slugs to prevent XSS (allow only alphanumeric + hyphens)
- **FR-039**: System MUST validate organization name length (min 2 characters, max 100 characters)

#### Integration with Better Auth
- **FR-040**: System MUST use Better Auth client methods (`authClient.organization.*`) for all organization operations
- **FR-041**: System MUST leverage Better Auth's `useListOrganizations()` hook for reactive organization data
- **FR-042**: System MUST call `authClient.organization.setActive()` when switching organizations to update session and JWT
- **FR-043**: System MUST reflect organization changes in JWT claims (`tenant_id`, `organization_ids`, `org_role`) immediately upon next token refresh

### Key Entities

- **Organization**: Represents a workspace/tenant with name, slug (unique identifier), logo (optional image), metadata (custom JSON), creation timestamp. An organization contains members and owns resources.

- **Member**: Junction between User and Organization with role (owner/admin/member), joined date. Represents user's membership and permissions within an organization.

- **Invitation**: Pending request to join organization with invitee email, organization reference, inviter reference, assigned role, status (pending/accepted/rejected/expired), expiry timestamp (48 hours from creation).

- **Role**: Enum defining permissions (owner = full control including delete, admin = manage members/settings, member = read-only access).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new organization in under 60 seconds (measure time from clicking "Create" to organization appearing in list)
- **SC-002**: Invitation acceptance workflow completes in under 30 seconds (measure time from clicking invitation link to seeing organization in user's list)
- **SC-003**: Organization switching updates active organization within 2 seconds (measure time from clicking "Switch" to JWT token reflecting new `tenant_id`)
- **SC-004**: Member list with 100 members loads and renders in under 1 second (paginated view, 50 members per page)
- **SC-005**: 95% of invitation emails deliver within 5 minutes of sending (track email service delivery rates)
- **SC-006**: Organization dashboard supports 10,000+ organizations per user without performance degradation (virtual scrolling for large lists)
- **SC-007**: Zero XSS vulnerabilities in organization name/slug/description inputs (verified by security scan)
- **SC-008**: Admin bulk operations on 100 organizations complete within 30 seconds (or run async with progress indicator for larger batches)
- **SC-009**: Slug collision detection prevents duplicate slugs with 100% accuracy (validated by uniqueness constraint tests)
- **SC-010**: Users successfully complete organization creation on first attempt 85% of the time (track form validation errors and retries)
- **SC-011**: Organization settings auto-save without errors 99.9% of the time (track save success rate)
- **SC-012**: Invitation expiry enforcement has zero failures (all expired invitations rejected, validated by automated tests)

### User Experience Success

- **SC-013**: Users report satisfaction score of 4.5/5 or higher for organization management workflows (collect via in-app surveys)
- **SC-014**: Support tickets related to organization invitations reduce by 60% after launch (baseline vs 30-day post-launch)
- **SC-015**: 80% of invited users accept invitations within 24 hours (measure invitation acceptance lag time)

## Constraints

### Technical Constraints
- **TC-001**: Must use Better Auth organization plugin methods exclusively (no direct database access for organization operations)
- **TC-002**: Must work with existing Next.js 15 App Router architecture (no migration to Pages Router)
- **TC-003**: Must integrate with existing Drizzle ORM schema (organization, member, invitation tables already defined)
- **TC-004**: Must maintain backward compatibility with existing JWT structure (custom claims: `tenant_id`, `organization_ids`, `org_role`)
- **TC-005**: Must use existing auth.ts configuration for organization hooks and email templates
- **TC-006**: Must work with existing session management (HttpOnly cookies, 7-day expiry)

### Security Constraints
- **TC-007**: All organization operations must enforce Better Auth's built-in RBAC (no custom permission system)
- **TC-008**: Invitation links must use cryptographically secure tokens (Better Auth handles generation)
- **TC-009**: Organization deletion must be permanent with no recovery (GDPR compliance)
- **TC-010**: Admin operations must log to audit trail (existing Better Auth audit capability)

### UI/UX Constraints
- **TC-011**: Must follow existing Taskflow SSO design system (Tailwind CSS, shadcn/ui components)
- **TC-012**: Must be mobile-responsive (organization management accessible on tablets/phones)
- **TC-013**: Must support dark mode (consistent with existing auth pages)
- **TC-014**: Must provide loading states for async operations (no blank screens during org switching)

### Data Constraints
- **TC-015**: Organization slugs must be globally unique (enforced by database constraint)
- **TC-016**: Users must belong to at least one organization (default "Taskflow" org via auto-join)
- **TC-017**: Invitations limited to 48-hour validity (Better Auth default, configurable)
- **TC-018**: Logo uploads limited to 2MB (prevent storage abuse)

## Non-Goals

**Explicitly out of scope for this feature:**

- **NG-001**: Multi-organization billing and subscription management (future feature)
- **NG-002**: Organization-level API keys or service accounts (future feature)
- **NG-003**: Sub-organizations or nested organization hierarchies (Better Auth supports "teams" within orgs - phase 2)
- **NG-004**: Custom branding per organization (custom domains, white-labeling - enterprise feature)
- **NG-005**: Organization activity feeds or audit logs UI (admin audit exists, but detailed activity feed is phase 2)
- **NG-006**: Advanced permission system beyond owner/admin/member roles (Better Auth supports custom access control statements - phase 2)
- **NG-007**: Organization resource quotas or limits (e.g., max members per org - future enforcement)
- **NG-008**: Social login integration per organization (e.g., "Login with Google Workspace for AI Lab" - phase 2)
- **NG-009**: Organization onboarding wizard or tutorials (phase 2 UX enhancement)
- **NG-010**: Exporting organization data or member lists (data portability - future feature)

## Assumptions

1. **Email Infrastructure**: Assumes email service (Resend or SMTP) is configured in `.env.local` for invitation emails. If not configured, invitations will fail gracefully with error message.

2. **Default Organization**: Assumes all users have been auto-joined to default "Taskflow" organization via existing database hook. New users will continue to be auto-joined.

3. **JWT Refresh**: Assumes OAuth clients (RoboLearn, AI Native) handle JWT token refresh properly to pick up organization changes after switching.

4. **Better Auth Version**: Assumes Better Auth 1.0+ with organizations plugin support. Older versions may not have required client methods.

5. **User Roles**: Assumes existing user role system (admin/user) is separate from organization roles (owner/admin/member). Platform admins can access admin panel; organization roles scope organization-level permissions.

6. **Image Storage**: Assumes image uploads are handled by Better Auth's default storage mechanism (base64 in database or cloud storage if configured). No separate CDN integration required.

7. **Session Persistence**: Assumes organization switching updates session in database and invalidates old session tokens, forcing clients to refresh.

8. **Slug Format**: Assumes slugs follow URL-safe conventions (lowercase, alphanumeric, hyphens). No internationalization support for slugs (ASCII only).

9. **Invitation Delivery**: Assumes 99% email delivery rate. Invitation failures will be logged and retryable.

10. **Mobile UX**: Assumes organization management is primarily desktop-focused, with tablet support. Complex operations (bulk admin actions) may degrade on small mobile screens.

## Dependencies

### External Dependencies
- **Better Auth 1.0+**: Organizations plugin with client methods (`useListOrganizations`, `setActive`, `create`, `inviteMember`, etc.)
- **Email Service**: Resend API or SMTP configured for invitation emails
- **Next.js 15**: App Router with React Server Components
- **Drizzle ORM**: Existing schema with organization, member, invitation tables
- **Neon PostgreSQL**: Database with existing organization tables
- **Tailwind CSS + shadcn/ui**: Component library for consistent UI

### Internal Dependencies
- **Auth Configuration** (`src/lib/auth.ts`): Organization plugin configured, email templates defined, database hooks active
- **Auth Client** (`src/lib/auth-client.ts`): Better Auth client exported for organization operations
- **Database Schema** (`src/lib/db/schema.ts`): Organization tables present and migrated
- **Middleware** (`src/middleware.ts`): Session validation working for org-scoped requests

### Feature Dependencies
- **Auto-Join Hook**: Existing database hook that adds new users to default organization (already implemented)
- **JWT Claims**: Existing additional claims logic in auth.ts that includes `tenant_id`, `organization_ids`, `org_role` (already implemented)
- **Session Management**: Existing session tracking with `activeOrganizationId` (already implemented)

## Resolved Design Decisions

**These decisions were resolved during specification validation with informed defaults:**

### Decision 1: Organization Deletion Impact on OAuth Clients

**Question**: When an organization is deleted, should active OAuth authorization sessions for connected apps (RoboLearn, AI Native) be immediately revoked?

**Decision**: **Immediate Revocation (Option A)**

**Implementation**: Organization deletion immediately revokes all active OAuth sessions for that organization. Users authenticated to connected apps (RoboLearn, AI Native) with the deleted organization's `tenant_id` will be logged out and must re-authenticate with a different organization.

**Rationale**:
- **Data Isolation**: Prevents access to deleted organization resources (critical for multi-tenancy security)
- **User Expectation**: Deletion implies "complete removal" - active sessions should reflect this
- **OAuth Best Practice**: RFC 6749 encourages token revocation on security events; organization deletion qualifies
- **Better Auth Support**: Platform likely provides `revokeAllSessions(organizationId)` method

**Impact**: Users experience immediate logout from connected apps (acceptable given deletion is rare, requires confirmation, and typically happens when organization is no longer needed)

---

### Decision 2: Invitation Email Template Customization

**Question**: Should organization owners/admins be able to customize invitation email templates?

**Decision**: **System Template Only (Option A) for MVP**

**Implementation**: All invitation emails use standard Taskflow SSO template including organization name, inviter name, assigned role, and accept/decline links. No customization options in MVP.

**Rationale**:
- **Faster MVP**: Eliminates custom template UI, validation, storage, and security concerns (prevent phishing)
- **Professional Consistency**: All users receive same polished template (reduces support burden)
- **Better Auth Default**: Aligns with platform's out-of-box email template capability
- **Phase 2 Path**: Custom messages (200-char field) can be added later without breaking changes

**Non-Goal Addition**: NG-011: Custom invitation email template editor (full subject/body/footer customization - enterprise feature)

---

### Decision 3: Organization Logo Storage Strategy

**Question**: Should organization logos be stored in database, cloud storage, or external URLs?

**Decision**: **Database Storage (Option A) for MVP with Performance Monitoring**

**Implementation**: Store organization logos in database (base64 encoding) using Better Auth's default storage mechanism. 2MB upload limit (FR-037) constrains database growth. Monitor database size and image serving performance.

**Rationale**:
- **Zero Infrastructure**: No S3/R2 setup, API keys, or bucket configuration required
- **Better Auth Default**: Assumption #6 confirms platform handles this natively
- **Migration Path**: Can move to cloud storage (Cloudflare R2) in Phase 2 without API changes if needed
- **Controlled Scale**: 2MB limit + expected org count (<1000 MVP) = manageable database impact

**Monitoring Trigger Points** (migrate to cloud storage if exceeded):
- Database size: >500MB attributed to logo storage
- Image serving latency: p95 >100ms for logo-heavy pages
- Expected scale: >1000 organizations with logos

**Migration Path**: Better Auth supports pluggable storage backends. Moving to R2 requires only configuration change, no code rewrite.

## Validation Checklist

- [ ] All user stories are independently testable and deliver standalone value
- [ ] Each functional requirement is testable and measurable
- [ ] Success criteria include both quantitative metrics and qualitative measures
- [ ] Constraints clearly define boundaries (technical, security, UX, data)
- [ ] Non-goals prevent scope creep and set clear expectations
- [ ] Dependencies are documented with version requirements
- [ ] Open questions identify critical decisions blocking implementation
- [ ] Edge cases cover error scenarios and boundary conditions
- [ ] Assumptions are explicit and verifiable
- [ ] Specification is technology-agnostic where possible (focuses on WHAT, not HOW)
