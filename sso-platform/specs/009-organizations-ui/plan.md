# Implementation Plan: Organizations UI Feature

**Feature Branch**: `009-organizations-ui`
**Created**: 2025-12-09
**Work Type**: ENGINEERING (Frontend UI + Better Auth Integration)
**Platform**: Taskflow SSO (Next.js 15, Better Auth, Drizzle ORM, Neon PostgreSQL)

---

## Executive Summary

This plan details the implementation of a complete multi-tenant organization management UI for Taskflow SSO. The backend infrastructure (database schema, JWT claims, organization plugin) is 60% complete. This feature adds all missing UI components and workflows to expose organization capabilities to end users.

**Key Deliverables**: 7 user-facing workflows, 43 functional requirements, RBAC enforcement, rate limiting, and comprehensive testing across 3 implementation phases.

---

## 1. Architecture Overview

### 1.1 Component Hierarchy

```
src/
├── app/
│   ├── account/
│   │   ├── organizations/              # P1: Organization Discovery & Switching
│   │   │   ├── page.tsx                # Organization list view
│   │   │   ├── components/
│   │   │   │   ├── OrganizationCard.tsx
│   │   │   │   ├── CreateOrgDialog.tsx  # P1: Create Organization
│   │   │   │   └── OrgSwitcher.tsx      # Quick switcher component
│   │   │   └── [orgId]/                # Organization details
│   │   │       └── settings/
│   │   │           ├── page.tsx        # P3: Settings hub
│   │   │           ├── general/        # P3: General settings
│   │   │           │   └── page.tsx
│   │   │           ├── members/        # P2: Member Management
│   │   │           │   ├── page.tsx
│   │   │           │   └── components/
│   │   │           │       ├── MemberList.tsx
│   │   │           │       ├── InviteMemberDialog.tsx  # P2: Invitations
│   │   │           │       ├── PendingInvitations.tsx
│   │   │           │       ├── RoleChangeDialog.tsx
│   │   │           │       └── RemoveMemberDialog.tsx
│   │   │           └── danger/         # P3: Delete org, transfer ownership
│   │   │               └── page.tsx
│   │   └── profile/
│   │       └── page.tsx                # P3: Enhanced with org section
│   │
│   ├── accept-invitation/              # P2: Invitation Acceptance
│   │   ├── [invitationId]/
│   │   │   └── page.tsx
│   │   └── components/
│   │       └── AcceptInvitationCard.tsx
│   │
│   └── admin/
│       └── organizations/              # P3: Admin Panel
│           ├── page.tsx                # Organization management
│           └── components/
│               ├── OrgListTable.tsx
│               ├── OrgDetailsModal.tsx
│               ├── BulkActionsToolbar.tsx
│               └── OrgSearchFilter.tsx
│
├── components/
│   ├── organizations/                  # Shared org components
│   │   ├── OrgLogo.tsx                 # Logo display with fallback
│   │   ├── OrgBadge.tsx                # Role/status badges
│   │   ├── OrgSelector.tsx             # Dropdown for quick switching
│   │   └── SlugInput.tsx               # Auto-sanitizing slug field
│   │
│   └── ui/                             # Existing shadcn/ui components
│       ├── dialog.tsx                  # Used for modals
│       ├── dropdown-menu.tsx           # Used for actions
│       ├── badge.tsx                   # Role badges
│       ├── table.tsx                   # Member lists
│       ├── input.tsx                   # Form fields
│       └── button.tsx                  # Actions
│
├── lib/
│   ├── auth-client.ts                  # Better Auth client (already has organizationClient)
│   ├── hooks/
│   │   └── useOrganizations.ts         # Custom hook wrapping Better Auth
│   └── utils/
│       ├── organization.ts             # Org-related utilities
│       └── validation.ts               # Slug validation, email validation
│
└── types/
    └── organization.ts                 # TypeScript interfaces
```

### 1.2 State Management Strategy

**Better Auth Native Hooks** (Primary):
```typescript
// Better Auth provides these hooks out of the box
import {
  useActiveOrganization,     // Current active org
  useListOrganizations,       // All orgs user belongs to
} from "@/lib/auth-client";

// Example usage
const { data: orgs, isPending } = useListOrganizations();
const { data: activeOrg } = useActiveOrganization();
```

**Custom React Hooks** (Thin wrappers for complex logic):
```typescript
// src/lib/hooks/useOrganizations.ts
export function useOrganizationSwitcher() {
  const { data: orgs } = useListOrganizations();
  const { data: activeOrg } = useActiveOrganization();

  const switchOrg = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId });
    // JWT updates automatically via Better Auth
  };

  return { orgs, activeOrg, switchOrg };
}
```

**Local State** (for UI-only concerns):
- Form state: React Hook Form
- Dialogs/modals: useState
- Optimistic updates: React Query (if needed)

**Session State** (Better Auth manages):
- `activeOrganizationId` in session table
- JWT claims (`tenant_id`, `organization_ids`, `org_role`)

---

## 2. Implementation Phases (Dependency-Ordered)

### Phase 1 (P1): Core Organization Discovery & Creation
**Priority**: Critical foundation | **Timeline**: 8 hours | **Deliverables**: User Stories 1-2

#### Tasks:
1. **Organization List View** (`/account/organizations`)
   - Server component fetching orgs via Better Auth API
   - Display org cards (name, logo, member count, role, active badge)
   - Responsive grid layout (2 cols tablet, 3 cols desktop)
   - Empty state for users with only default org
   - **Dependencies**: None (uses existing auth.ts config)
   - **Test**: User with 3 orgs sees all 3 cards with correct data

2. **Organization Switcher** (Component)
   - Dropdown in header/profile showing all orgs
   - Click to switch → calls `authClient.organization.setActive()`
   - Optimistic UI update (active badge moves immediately)
   - JWT refresh handled by Better Auth
   - **Dependencies**: Org list view
   - **Test**: Switch org → JWT `tenant_id` changes → OAuth clients see new tenant

3. **Create Organization Dialog**
   - Modal triggered from "Create Organization" button
   - Form fields: name (required), slug (auto-generated, editable), logo (optional), description (optional)
   - Slug sanitization: lowercase, alphanumeric + hyphens
   - Real-time slug availability check (debounced)
   - Logo upload: 2MB limit, PNG/JPG/GIF only
   - **Dependencies**: None
   - **Test**: Create org → appears in list with "Owner" role → user auto-switched to new org

4. **OrganizationCard Component**
   - Display org name, logo (with fallback icon), member count
   - Show user's role badge (owner/admin/member)
   - Active org highlighted with border/badge
   - Actions: "Switch" button, settings link (owner/admin only)
   - **Dependencies**: None
   - **Test**: Card shows correct data for each org

#### Acceptance Criteria (P1):
- [ ] User sees all organizations they belong to
- [ ] User can switch active organization in <2 seconds
- [ ] User can create new organization with name + slug
- [ ] Slug auto-sanitizes to URL-safe format
- [ ] Creating user becomes organization owner
- [ ] New organization appears in list immediately

---

### Phase 2 (P2): Invitations & Member Management
**Priority**: Team collaboration | **Timeline**: 10 hours | **Deliverables**: User Stories 3-4

#### Tasks:
1. **Organization Settings Pages**
   - Settings layout: `/account/organizations/[orgId]/settings`
   - Tabs: General, Members, Danger Zone
   - Permission check: Redirect non-members, show read-only for members
   - **Dependencies**: P1 (org list)
   - **Test**: Owner sees all tabs, member sees General only

2. **Invite Member Dialog**
   - Modal in Members tab
   - Form: email (required), role dropdown (owner/admin/member)
   - Email validation (RFC 5322 format)
   - Duplicate check: Error if user already a member
   - Rate limit enforcement: 5 invites/hour (Better Auth handles)
   - **Dependencies**: Settings layout
   - **Test**: Send invite → email delivered → invitation in "Pending" list

3. **Invitation Acceptance Flow** (`/accept-invitation/[id]`)
   - Public page (no auth required if user not signed in)
   - Display org details (name, logo, inviter name, assigned role)
   - Actions: "Accept" (adds user to org), "Decline" (marks invitation rejected)
   - Expiry check: If >48 hours, show "Invitation expired" message
   - **Dependencies**: Invite dialog
   - **Test**: Click link → see org details → accept → org appears in user's list

4. **Pending Invitations List**
   - Table showing pending invites in Members tab
   - Columns: Email, Role, Sent Date, Expiry, Actions
   - Actions: Resend email, Cancel invitation
   - Auto-refresh expiry status (highlight expired in red)
   - **Dependencies**: Invite dialog
   - **Test**: Send invite → appears in pending list → cancel → disappears

5. **Member List Component**
   - Paginated table (50 members per page)
   - Columns: Name/Email, Role, Joined Date, Actions
   - Search/filter: By name, email, or role
   - Role change dropdown (owner/admin only)
   - Remove member button (owner/admin only)
   - **Dependencies**: Settings layout
   - **Test**: List 100 members → renders in <1 second → change role → updates

6. **Member Management Actions**
   - Change role: Confirmation dialog → update via Better Auth API
   - Remove member: Confirmation with "Are you sure?" → delete membership
   - Leave org: Member can leave (except sole owner)
   - Prevent zero owners: Show error if trying to remove last owner
   - **Dependencies**: Member list
   - **Test**: Change member from "member" to "admin" → updates → refresh → still "admin"

#### Acceptance Criteria (P2):
- [ ] Owner/admin can invite members via email
- [ ] Invitations send within 5 minutes with 95% delivery rate
- [ ] Invitee receives email with accept/decline link
- [ ] Accepting invitation adds user to org with correct role
- [ ] Expired invitations (>48 hours) show error message
- [ ] Member list supports search, pagination, role changes, removal
- [ ] Cannot remove last owner without transferring ownership first

---

### Phase 3 (P3): Settings, Admin Panel, Profile Integration
**Priority**: Nice-to-have enhancements | **Timeline**: 8 hours | **Deliverables**: User Stories 5-7

#### Tasks:
1. **General Settings Page** (`/account/organizations/[orgId]/settings/general`)
   - Edit org name, slug, logo, description, metadata
   - Slug change: Show warning about old slug redirect (30 days)
   - Logo upload: Drag-drop or file picker, preview before save
   - Auto-save: Debounced save on input change (or explicit "Save" button)
   - **Dependencies**: Settings layout
   - **Test**: Change org name → save → navigate away → come back → name persisted

2. **Danger Zone Settings** (`/account/organizations/[orgId]/settings/danger`)
   - Transfer ownership: Dropdown of members → confirmation dialog
   - Delete organization: Requires typing org name to confirm
   - Warning: "This will remove all members, archive resources, delete data"
   - OAuth session revocation: Immediate on delete (implemented in backend)
   - **Dependencies**: Settings layout
   - **Test**: Delete org → all members removed → org disappears from lists

3. **Profile Page Enhancement** (`/account/profile`)
   - Add "Active Organization" section between personal details and work profile
   - Show: Org logo, name, member count, user's role badge
   - Quick switcher: Dropdown to switch orgs without leaving profile
   - "View All Organizations" link to `/account/organizations`
   - **Dependencies**: P1 (org switcher component)
   - **Test**: Profile shows active org → switch via dropdown → active org updates

4. **Admin Organization Management** (`/admin/organizations`)
   - Paginated table (50 orgs per page)
   - Columns: Name, Slug, Members, Owner, Created, Status, Actions
   - Search: By name or slug
   - Filters: Active orgs, orgs with >X members
   - Bulk actions: Disable, enable, delete (with confirmation)
   - Details modal: Full org details (members, invitations, OAuth clients)
   - **Dependencies**: Admin layout
   - **Test**: Admin sees all orgs → search "panaversity" → filters to matching orgs

5. **Admin Bulk Operations**
   - Select multiple orgs via checkboxes
   - Toolbar appears: "Disable X organizations", "Delete X organizations"
   - Confirmation dialog shows impact (e.g., "100 members will lose access")
   - Async processing for large batches (>100 orgs): Show progress bar
   - Audit log entries created for each operation
   - **Dependencies**: Admin org list
   - **Test**: Select 5 orgs → bulk disable → all 5 disabled → audit log entries created

#### Acceptance Criteria (P3):
- [ ] Owner can update org name, slug, logo, description
- [ ] Owner can transfer ownership to another member
- [ ] Owner can delete org (requires confirmation)
- [ ] Profile page shows active org with quick switcher
- [ ] Admin can view, search, filter all organizations
- [ ] Admin can perform bulk operations with progress tracking
- [ ] All admin actions log to audit trail

---

## 3. Integration Points

### 3.1 Better Auth Client Methods

**Organization Client** (from `src/lib/auth-client.ts`):
```typescript
import { authClient } from "@/lib/auth-client";

// Create organization
await authClient.organization.create({
  name: "Panaversity AI Lab",
  slug: "panaversity-ai",
  logo: "data:image/png;base64,...",
  metadata: JSON.stringify({ industry: "education" }),
});

// List user's organizations
const { data } = await authClient.organization.list();

// Set active organization (switches context)
await authClient.organization.setActive({
  organizationId: "org_abc123",
});

// Invite member
await authClient.organization.inviteMember({
  organizationId: "org_abc123",
  email: "colleague@example.com",
  role: "admin",
});

// Update member role
await authClient.organization.updateMemberRole({
  organizationId: "org_abc123",
  userId: "user_xyz",
  role: "owner",
});

// Remove member
await authClient.organization.removeMember({
  organizationId: "org_abc123",
  userId: "user_xyz",
});

// Delete organization
await authClient.organization.delete({
  organizationId: "org_abc123",
});
```

**React Hooks** (Better Auth provides):
```typescript
import { useActiveOrganization, useListOrganizations } from "@/lib/auth-client";

// In component
const { data: activeOrg, isPending } = useActiveOrganization();
const { data: orgs, isPending: orgsLoading } = useListOrganizations();
```

### 3.2 Email Integration (src/lib/auth.ts)

**Invitation Emails** (already configured in auth.ts):
- Better Auth sends emails via `sendEmail()` function (Resend or SMTP)
- Template: System default (professional, includes org name, inviter, role, accept/decline links)
- Customization: Not in MVP (system template only per Decision 2)
- Rate limiting: 5 invitations/hour enforced by Better Auth

**Email Configuration** (from auth.ts:630):
```typescript
organization({
  allowUserToCreateOrganization: true,
  // Email template handled by Better Auth default
  // Invitation expiry: 48 hours (Better Auth default)
})
```

### 3.3 Database Schema (auth-schema.ts)

**Organization Table**:
```typescript
organization: {
  id: text (PK)
  name: text (required)
  slug: text (unique, required) // URL-safe identifier
  logo: text (optional)          // Base64 or cloud URL
  metadata: text (optional)      // JSON for custom fields
  createdAt: timestamp
}
```

**Member Table**:
```typescript
member: {
  id: text (PK)
  organizationId: text (FK → organization.id, cascade delete)
  userId: text (FK → user.id, cascade delete)
  role: text (default: "member") // owner | admin | member
  createdAt: timestamp
}
```

**Invitation Table**:
```typescript
invitation: {
  id: text (PK)
  organizationId: text (FK → organization.id, cascade delete)
  email: text (required)
  role: text (optional)
  status: text (default: "pending") // pending | accepted | rejected | expired
  expiresAt: timestamp (required)   // 48 hours from creation
  inviterId: text (FK → user.id, cascade delete)
  createdAt: timestamp
}
```

**Session Table** (includes):
```typescript
session: {
  activeOrganizationId: text (optional) // Current active org for user
  // ... other session fields
}
```

### 3.4 JWT Claims (auth.ts:580-617)

**Custom Claims** (added to ID tokens and userinfo):
```typescript
{
  tenant_id: "org_abc123",           // Active organization ID
  organization_ids: ["org_1", "org_2"], // All orgs user belongs to
  org_role: "admin",                 // Role in active organization
  // ... standard OIDC claims
}
```

**Automatic Update**: When user switches organizations via `setActive()`, Better Auth:
1. Updates `session.activeOrganizationId` in database
2. Regenerates JWT with new `tenant_id` claim
3. Connected OAuth clients receive updated token on next refresh

---

## 4. Security Implementation

### 4.1 Role-Based Access Control (RBAC)

**Permissions Matrix**:
| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| View organization | ✅ | ✅ | ✅ |
| Switch organization | ✅ | ✅ | ✅ |
| Update org settings | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ |
| Delete organization | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |

**Server-Side Enforcement**:
```typescript
// Example: Protect settings page (server component)
export default async function SettingsPage({ params }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { orgId } = params;

  // Verify user is member of org
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, orgId),
      eq(member.userId, session.user.id)
    ),
  });

  if (!membership) {
    redirect("/account/organizations"); // Not a member
  }

  const isOwnerOrAdmin = ["owner", "admin"].includes(membership.role);

  return (
    <div>
      {isOwnerOrAdmin ? <EditableSettings /> : <ReadOnlyView />}
    </div>
  );
}
```

**Client-Side UI Hiding** (not security, UX only):
```typescript
// Hide "Delete Org" button from non-owners
{role === "owner" && <DeleteOrgButton />}
```

### 4.2 Input Validation & Sanitization

**Slug Validation**:
```typescript
// src/lib/utils/validation.ts
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")  // Replace non-alphanumeric with hyphens
    .replace(/-+/g, "-")          // Collapse multiple hyphens
    .replace(/^-|-$/g, "");       // Remove leading/trailing hyphens
}

export function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 2 && slug.length <= 50;
}
```

**XSS Prevention**:
- All user inputs (org name, description) rendered via React (auto-escaped)
- Logo URLs validated: Only allow `data:` URIs or HTTPS URLs
- Metadata: Store as JSON, parse safely before rendering
- Never use `dangerouslySetInnerHTML` with user content

**Email Validation**:
```typescript
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // RFC 5322 simplified
}
```

### 4.3 Rate Limiting

**Better Auth Built-In** (from auth.ts:422-503):
- Global: 3000 req/min per IP
- Invitation sending: 5 invites/hour per organization (enforced by Better Auth)
- No client-side rate limit needed (handled by API)

**Client-Side Feedback**:
```typescript
// Show error toast when rate limit hit
try {
  await authClient.organization.inviteMember({ ... });
} catch (error) {
  if (error.message.includes("rate limit")) {
    toast.error("Rate limit exceeded. Max 5 invitations per hour.");
  }
}
```

### 4.4 CSRF Protection

**Better Auth Handles**:
- Session tokens in HttpOnly cookies (not accessible to JavaScript)
- CSRF tokens automatically included in requests
- No additional implementation needed

### 4.5 Audit Logging

**Backend Audit Entries** (Better Auth creates automatically):
- Organization created
- Member invited
- Member role changed
- Member removed
- Organization deleted (admin action)

**Admin Audit Log** (already exists in `/admin`):
- View audit trail for all organization operations
- Filter by action type, user, date range
- Export audit logs for compliance

---

## 5. Performance Optimization

### 5.1 Data Fetching Strategy

**Server Components** (default for Next.js 15):
```typescript
// Fetch orgs on server → no client-side fetch overhead
export default async function OrganizationsPage() {
  const orgs = await authClient.organization.list();
  return <OrgList orgs={orgs.data} />;
}
```

**Client-Side Caching** (React Query via Better Auth hooks):
- `useListOrganizations()` caches org list for 5 minutes
- `useActiveOrganization()` caches active org
- Automatic revalidation on `setActive()` mutation

### 5.2 Pagination & Virtual Scrolling

**Member List** (100+ members):
- Server-side pagination: 50 members per page
- Use Better Auth's pagination params: `limit`, `offset`
- Virtual scrolling for large lists (react-window if >500 members)

**Admin Org List** (1000+ orgs):
- Server-side pagination: 50 orgs per page
- Search/filter on backend (Postgres full-text search)
- Debounced search input (500ms) to reduce queries

### 5.3 Image Optimization

**Organization Logos**:
- Next.js `<Image>` component for automatic optimization
- Fallback icon if logo missing (initials in colored circle)
- Lazy loading for off-screen logos
- 2MB upload limit enforced (prevent large database storage)

**Logo Storage** (from spec Decision 3):
- Database storage (base64) for MVP
- Monitor trigger points: >500MB logo storage or p95 >100ms load time
- Migration path to Cloudflare R2 in Phase 2 if needed

### 5.4 Optimistic UI Updates

**Organization Switching**:
```typescript
const switchOrg = async (orgId: string) => {
  // Optimistic update (UI changes immediately)
  setActiveOrgLocal(orgId);

  try {
    await authClient.organization.setActive({ organizationId: orgId });
    // Success → backend confirms, JWT updates
  } catch (error) {
    // Rollback optimistic update on failure
    setActiveOrgLocal(previousOrgId);
    toast.error("Failed to switch organization");
  }
};
```

**Member Role Changes**:
- Update table row immediately (optimistic)
- Rollback if API call fails
- Show loading spinner on action button during request

---

## 6. UI/UX Design Patterns

### 6.1 Design System (Existing Taskflow SSO Patterns)

**Layout Hierarchy** (from existing pages):
- Header: Sticky, white background, logo, user menu
- Content: Max-width container (3xl: 768px for forms, 7xl: 1280px for tables)
- Cards: White background, rounded-2xl, shadow-xl, border-slate-200
- Spacing: Generous padding (p-8 to p-10)

**Color Palette** (from tailwind.config.ts):
- Primary: `taskflow-500` to `taskflow-600` (blue gradient)
- Background: `slate-50` with gradient overlays
- Text: `slate-900` (headings), `slate-600` (body)
- Borders: `slate-200/50` (semi-transparent)

**Typography**:
- Headings: `text-4xl font-bold` (H1), `text-2xl font-bold` (H2)
- Body: `text-base` (15px), `text-sm` (14px)
- Font: System stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI'...`)

### 6.2 Component Patterns

**OrganizationCard** (from spec User Story 1):
```tsx
<Card className="hover:shadow-2xl transition-shadow">
  <CardHeader>
    <div className="flex items-center gap-4">
      <OrgLogo src={org.logo} name={org.name} size="lg" />
      <div>
        <h3 className="text-xl font-semibold">{org.name}</h3>
        <p className="text-sm text-muted-foreground">@{org.slug}</p>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between">
      <Badge variant={isActive ? "default" : "outline"}>
        {isActive ? "Active" : role}
      </Badge>
      <span className="text-sm text-muted-foreground">
        {memberCount} members
      </span>
    </div>
  </CardContent>
  <CardFooter>
    {!isActive && <Button onClick={switchOrg}>Switch</Button>}
    {isOwnerOrAdmin && <Link href="settings">Settings</Link>}
  </CardFooter>
</Card>
```

**CreateOrgDialog** (from spec User Story 2):
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button size="lg">+ Create Organization</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New Organization</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      <Input name="name" label="Organization Name" required />
      <SlugInput
        name="slug"
        autoGenerateFrom="name"
        checkAvailability={true}
      />
      <FileUpload name="logo" accept="image/*" maxSize={2 * 1024 * 1024} />
      <Textarea name="description" label="Description (optional)" />
      <DialogFooter>
        <Button type="submit" loading={isSubmitting}>
          Create Organization
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

**MemberList** (from spec User Story 4):
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Member</TableHead>
      <TableHead>Role</TableHead>
      <TableHead>Joined</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {members.map((member) => (
      <TableRow key={member.id}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>{member.name[0]}</Avatar>
            <div>
              <div className="font-medium">{member.name}</div>
              <div className="text-sm text-muted-foreground">{member.email}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          {isOwnerOrAdmin ? (
            <RoleDropdown member={member} onChange={handleRoleChange} />
          ) : (
            <Badge>{member.role}</Badge>
          )}
        </TableCell>
        <TableCell>{formatDate(member.joinedAt)}</TableCell>
        <TableCell className="text-right">
          {isOwnerOrAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asButton>...</DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => changeRole(member)}>
                  Change Role
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => removeMember(member)}>
                  Remove Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 6.3 Loading States & Skeletons

**Page-Level Loading** (suspense boundaries):
```tsx
<Suspense fallback={<OrgListSkeleton />}>
  <OrganizationList />
</Suspense>
```

**Button Loading** (during mutations):
```tsx
<Button disabled={isLoading}>
  {isLoading && <Spinner className="mr-2" />}
  {isLoading ? "Switching..." : "Switch Organization"}
</Button>
```

**Table Loading** (skeleton rows):
```tsx
{isLoading ? (
  <TableSkeletonRows count={5} columns={4} />
) : (
  members.map(member => <MemberRow key={member.id} member={member} />)
)}
```

### 6.4 Error Handling & Feedback

**Toast Notifications** (using shadcn/ui toast):
```typescript
import { toast } from "@/components/ui/use-toast";

// Success
toast.success("Organization created successfully!");

// Error
toast.error("Failed to invite member. Please try again.");

// Rate limit
toast.error("Rate limit exceeded. Max 5 invitations per hour.");
```

**Inline Validation Errors**:
```tsx
<Input
  name="slug"
  error={slugError}
  helperText={slugError || "Lowercase, alphanumeric, hyphens only"}
/>
```

**Confirmation Dialogs** (destructive actions):
```tsx
<AlertDialog>
  <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
  <AlertDialogDescription>
    This will permanently delete the organization and remove all members.
    Type "{orgName}" to confirm.
  </AlertDialogDescription>
  <AlertDialogFooter>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
    <AlertDialogAction
      onClick={handleDelete}
      variant="destructive"
      disabled={confirmText !== orgName}
    >
      Delete Organization
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialog>
```

---

## 7. Test Strategy

### 7.1 Unit Tests (Vitest + React Testing Library)

**Component Tests**:
```typescript
// tests/components/OrganizationCard.test.tsx
describe("OrganizationCard", () => {
  it("displays organization name and logo", () => {
    render(<OrganizationCard org={mockOrg} />);
    expect(screen.getByText("Panaversity AI Lab")).toBeInTheDocument();
    expect(screen.getByAltText("Panaversity AI Lab logo")).toBeInTheDocument();
  });

  it("shows active badge for active organization", () => {
    render(<OrganizationCard org={mockOrg} isActive={true} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("hides settings link for members", () => {
    render(<OrganizationCard org={mockOrg} role="member" />);
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });
});
```

**Utility Tests**:
```typescript
// tests/utils/validation.test.ts
describe("sanitizeSlug", () => {
  it("converts to lowercase", () => {
    expect(sanitizeSlug("MyOrg")).toBe("myorg");
  });

  it("replaces spaces with hyphens", () => {
    expect(sanitizeSlug("AI Lab")).toBe("ai-lab");
  });

  it("removes special characters", () => {
    expect(sanitizeSlug("org@123!")).toBe("org-123");
  });
});
```

### 7.2 Integration Tests (Playwright E2E)

**Organization Creation Flow**:
```typescript
// tests/e2e/organization-creation.spec.ts
test("user creates organization successfully", async ({ page }) => {
  await page.goto("/account/organizations");
  await page.click("text=Create Organization");

  await page.fill('input[name="name"]', "Panaversity AI Lab");
  await page.fill('input[name="slug"]', "panaversity-ai");
  await page.setInputFiles('input[name="logo"]', "tests/fixtures/logo.png");

  await page.click("text=Create Organization");

  await expect(page.locator("text=Organization created successfully!")).toBeVisible();
  await expect(page.locator("text=Panaversity AI Lab")).toBeVisible();
  await expect(page.locator("text=Owner")).toBeVisible();
});
```

**Invitation Flow**:
```typescript
test("owner invites member and member accepts", async ({ page, context }) => {
  // Owner invites
  await page.goto("/account/organizations/org_123/settings/members");
  await page.click("text=Invite Member");
  await page.fill('input[name="email"]', "colleague@example.com");
  await page.selectOption('select[name="role"]', "admin");
  await page.click("text=Send Invitation");

  await expect(page.locator("text=Invitation sent to colleague@example.com")).toBeVisible();

  // Extract invitation link from email (mock or real email API)
  const invitationLink = await getInvitationLink("colleague@example.com");

  // Member accepts (new browser context)
  const memberPage = await context.newPage();
  await memberPage.goto(invitationLink);
  await expect(memberPage.locator("text=You've been invited to")).toBeVisible();
  await memberPage.click("text=Accept Invitation");

  await expect(memberPage.locator("text=You are now a member of")).toBeVisible();
});
```

**Permission Enforcement**:
```typescript
test("member cannot access settings page", async ({ page }) => {
  await signInAsMember(page);
  await page.goto("/account/organizations/org_123/settings/general");

  // Should redirect to organizations page or show error
  await expect(page.url()).toContain("/account/organizations");
  await expect(page.locator("text=You don't have permission")).toBeVisible();
});
```

### 7.3 API Tests (Better Auth Endpoints)

**Organization CRUD**:
```typescript
// tests/api/organization.test.ts
describe("Organization API", () => {
  it("creates organization with valid data", async () => {
    const response = await authClient.organization.create({
      name: "Test Org",
      slug: "test-org",
    });

    expect(response.data.organization.name).toBe("Test Org");
    expect(response.data.organization.slug).toBe("test-org");
  });

  it("rejects duplicate slug", async () => {
    await authClient.organization.create({ name: "Org 1", slug: "duplicate" });

    await expect(
      authClient.organization.create({ name: "Org 2", slug: "duplicate" })
    ).rejects.toThrow("Slug already exists");
  });

  it("enforces rate limit on invitations", async () => {
    // Send 5 invitations (max allowed)
    for (let i = 0; i < 5; i++) {
      await authClient.organization.inviteMember({
        organizationId: "org_123",
        email: `user${i}@example.com`,
        role: "member",
      });
    }

    // 6th invitation should fail
    await expect(
      authClient.organization.inviteMember({
        organizationId: "org_123",
        email: "user6@example.com",
        role: "member",
      })
    ).rejects.toThrow("Rate limit exceeded");
  });
});
```

### 7.4 Performance Tests

**Organization Switching** (Success Criteria SC-003):
```typescript
test("organization switching completes in <2 seconds", async ({ page }) => {
  await page.goto("/account/organizations");

  const startTime = Date.now();
  await page.click("text=Switch >> nth=0");
  await page.waitForSelector("text=Active"); // Wait for active badge update
  const endTime = Date.now();

  const duration = endTime - startTime;
  expect(duration).toBeLessThan(2000);
});
```

**Member List Load** (Success Criteria SC-004):
```typescript
test("member list with 100 members loads in <1 second", async ({ page }) => {
  await seedMembers(100); // Seed 100 members

  await page.goto("/account/organizations/org_123/settings/members");

  const startTime = Date.now();
  await page.waitForSelector("table tbody tr >> nth=49"); // Wait for 50th row
  const endTime = Date.now();

  const duration = endTime - startTime;
  expect(duration).toBeLessThan(1000);
});
```

### 7.5 Security Tests

**XSS Prevention**:
```typescript
test("organization name with XSS payload is escaped", async ({ page }) => {
  await authClient.organization.create({
    name: '<script>alert("XSS")</script>',
    slug: "xss-test",
  });

  await page.goto("/account/organizations");

  // Check that script tag is rendered as text, not executed
  const orgCard = page.locator("text=<script>alert(\"XSS\")</script>");
  await expect(orgCard).toBeVisible();

  // Verify no alert dialog appeared
  page.on("dialog", () => {
    throw new Error("XSS executed!");
  });
});
```

**RBAC Enforcement**:
```typescript
test("member cannot change other member roles", async ({ page }) => {
  await signInAsMember(page);

  const response = await authClient.organization.updateMemberRole({
    organizationId: "org_123",
    userId: "other_user_id",
    role: "admin",
  });

  expect(response.error).toBeDefined();
  expect(response.error.message).toContain("Unauthorized");
});
```

---

## 8. Routing Structure

### 8.1 User-Facing Routes

```
/account/organizations                     → Organization list (P1)
/account/organizations/[orgId]/settings    → Settings hub (redirect to /general)
/account/organizations/[orgId]/settings/general → General settings (P3)
/account/organizations/[orgId]/settings/members → Member management (P2)
/account/organizations/[orgId]/settings/danger  → Danger zone (P3)
/account/profile                           → Enhanced with org section (P3)
/accept-invitation/[invitationId]          → Invitation acceptance (P2)
```

### 8.2 Admin Routes

```
/admin/organizations                       → Org management (P3)
/admin/organizations/[orgId]               → Org details modal (P3)
```

### 8.3 Route Protection

**Middleware** (src/middleware.ts):
```typescript
export async function middleware(request: NextRequest) {
  const session = await getSession(request);

  // Protect /account/* routes
  if (request.nextUrl.pathname.startsWith("/account/organizations")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }

    // For /account/organizations/[orgId]/* - verify membership
    const orgIdMatch = request.nextUrl.pathname.match(/\/organizations\/([^\/]+)/);
    if (orgIdMatch) {
      const orgId = orgIdMatch[1];
      const isMember = await verifyOrgMembership(session.user.id, orgId);
      if (!isMember) {
        return NextResponse.redirect(new URL("/account/organizations", request.url));
      }
    }
  }

  return NextResponse.next();
}
```

**Server Component Protection** (in page.tsx):
```typescript
export default async function SettingsPage({ params }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const membership = await verifyMembership(session.user.id, params.orgId);

  if (!membership) {
    redirect("/account/organizations");
  }

  const canEdit = ["owner", "admin"].includes(membership.role);

  return <SettingsForm canEdit={canEdit} />;
}
```

---

## 9. File Structure (Complete)

```
src/
├── app/
│   ├── account/
│   │   ├── layout.tsx                     # Existing (reuse)
│   │   ├── profile/
│   │   │   ├── page.tsx                   # MODIFY (add org section)
│   │   │   └── ProfileForm.tsx            # Existing
│   │   └── organizations/
│   │       ├── page.tsx                   # CREATE (org list)
│   │       ├── components/
│   │       │   ├── OrganizationCard.tsx   # CREATE
│   │       │   ├── CreateOrgDialog.tsx    # CREATE
│   │       │   ├── OrgSwitcher.tsx        # CREATE
│   │       │   └── EmptyState.tsx         # CREATE
│   │       └── [orgId]/
│   │           └── settings/
│   │               ├── layout.tsx         # CREATE (tabs layout)
│   │               ├── page.tsx           # CREATE (redirect to /general)
│   │               ├── general/
│   │               │   ├── page.tsx       # CREATE
│   │               │   └── components/
│   │               │       ├── GeneralSettingsForm.tsx # CREATE
│   │               │       └── LogoUpload.tsx          # CREATE
│   │               ├── members/
│   │               │   ├── page.tsx       # CREATE
│   │               │   └── components/
│   │               │       ├── MemberList.tsx          # CREATE
│   │               │       ├── MemberRow.tsx           # CREATE
│   │               │       ├── InviteMemberDialog.tsx  # CREATE
│   │               │       ├── PendingInvitations.tsx  # CREATE
│   │               │       ├── RoleChangeDialog.tsx    # CREATE
│   │               │       └── RemoveMemberDialog.tsx  # CREATE
│   │               └── danger/
│   │                   ├── page.tsx       # CREATE
│   │                   └── components/
│   │                       ├── DeleteOrgDialog.tsx     # CREATE
│   │                       └── TransferOwnershipDialog.tsx # CREATE
│   │
│   ├── accept-invitation/
│   │   └── [invitationId]/
│   │       ├── page.tsx                   # CREATE (public invitation page)
│   │       └── components/
│   │           └── AcceptInvitationCard.tsx # CREATE
│   │
│   └── admin/
│       ├── layout.tsx                     # Existing (add nav link)
│       └── organizations/
│           ├── page.tsx                   # CREATE
│           └── components/
│               ├── OrgListTable.tsx       # CREATE
│               ├── OrgDetailsModal.tsx    # CREATE
│               ├── BulkActionsToolbar.tsx # CREATE
│               └── OrgSearchFilter.tsx    # CREATE
│
├── components/
│   ├── organizations/
│   │   ├── OrgLogo.tsx                    # CREATE (logo with fallback)
│   │   ├── OrgBadge.tsx                   # CREATE (role/status badges)
│   │   ├── OrgSelector.tsx                # CREATE (dropdown switcher)
│   │   └── SlugInput.tsx                  # CREATE (auto-sanitizing input)
│   │
│   └── ui/                                # Existing shadcn/ui components
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── badge.tsx
│       ├── table.tsx
│       ├── input.tsx
│       ├── button.tsx
│       ├── avatar.tsx                     # ADD (if not exists)
│       ├── tabs.tsx                       # ADD (for settings tabs)
│       └── alert-dialog.tsx               # ADD (for confirmations)
│
├── lib/
│   ├── auth.ts                            # Existing (no changes)
│   ├── auth-client.ts                     # Existing (already has organizationClient)
│   ├── hooks/
│   │   ├── useOrganizations.ts            # CREATE
│   │   ├── useOrgSwitcher.ts              # CREATE
│   │   └── useOrgPermissions.ts           # CREATE
│   └── utils/
│       ├── organization.ts                # CREATE
│       ├── validation.ts                  # CREATE (slug, email validation)
│       └── format.ts                      # CREATE (date formatting, etc.)
│
├── types/
│   └── organization.ts                    # CREATE
│
└── middleware.ts                          # MODIFY (add org membership check)

tests/
├── components/
│   └── organizations/
│       ├── OrganizationCard.test.tsx      # CREATE
│       ├── CreateOrgDialog.test.tsx       # CREATE
│       └── MemberList.test.tsx            # CREATE
│
├── e2e/
│   └── organizations/
│       ├── organization-creation.spec.ts  # CREATE
│       ├── invitation-flow.spec.ts        # CREATE
│       ├── member-management.spec.ts      # CREATE
│       └── org-switching.spec.ts          # CREATE
│
└── api/
    └── organization.test.ts               # CREATE
```

**Total New Files**: ~40 files
**Modified Files**: 3 files (profile/page.tsx, admin/layout.tsx, middleware.ts)

---

## 10. Implementation Timeline

### Week 1: Phase 1 (P1 - Core Foundation)
**Duration**: 8 hours | **Developer**: 1 frontend engineer

**Day 1-2** (4 hours):
- [ ] Create organization list page (`/account/organizations`)
- [ ] Implement OrganizationCard component
- [ ] Add CreateOrgDialog with slug sanitization
- [ ] Set up routing and layouts

**Day 3** (2 hours):
- [ ] Implement organization switcher component
- [ ] Add optimistic UI updates for switching
- [ ] Test JWT claim updates

**Day 4** (2 hours):
- [ ] Write unit tests for components
- [ ] E2E test for org creation and switching
- [ ] Performance test (switching <2s)

**Deliverables**: Users can view, create, and switch organizations

---

### Week 2: Phase 2 (P2 - Invitations & Members)
**Duration**: 10 hours | **Developer**: 1 frontend engineer

**Day 1-2** (4 hours):
- [ ] Create settings layout with tabs
- [ ] Implement members tab with member list
- [ ] Add pagination and search

**Day 3** (3 hours):
- [ ] Create InviteMemberDialog component
- [ ] Implement PendingInvitations list
- [ ] Add rate limit error handling

**Day 4** (2 hours):
- [ ] Create invitation acceptance page
- [ ] Add accept/decline actions
- [ ] Handle expiry validation

**Day 5** (1 hour):
- [ ] Write tests for invitation flow
- [ ] E2E test from invite to accept
- [ ] Verify email delivery (mock or real)

**Deliverables**: Complete invitation and member management workflows

---

### Week 3: Phase 3 (P3 - Settings & Admin)
**Duration**: 8 hours | **Developer**: 1 frontend engineer

**Day 1** (2 hours):
- [ ] Create general settings page
- [ ] Implement logo upload component
- [ ] Add slug change warning

**Day 2** (2 hours):
- [ ] Create danger zone settings
- [ ] Implement delete org dialog (with confirmation)
- [ ] Add transfer ownership dialog

**Day 3** (2 hours):
- [ ] Enhance profile page with org section
- [ ] Add quick switcher to profile
- [ ] Test integration

**Day 4-5** (2 hours):
- [ ] Create admin organizations page
- [ ] Implement bulk actions toolbar
- [ ] Add admin org details modal
- [ ] Write admin panel tests

**Deliverables**: Complete settings, admin panel, profile integration

---

### Total Timeline: **3 weeks (26 hours total)**
- Phase 1: 8 hours
- Phase 2: 10 hours
- Phase 3: 8 hours

**Buffer**: 4 hours for bug fixes, polish, documentation

---

## 11. Technical Decisions & Rationale

### Decision 1: Server Components vs Client Components

**Choice**: Server components for pages, client components for interactive elements

**Rationale**:
- Next.js 15 App Router defaults to server components
- Organization list fetched on server → no client-side fetch overhead
- Interactive dialogs (create org, invite member) use "use client"
- Better performance: Smaller client bundles, faster initial load

**Implementation**:
```typescript
// app/account/organizations/page.tsx (SERVER)
export default async function OrganizationsPage() {
  const orgs = await authClient.organization.list();
  return <OrgList orgs={orgs.data} />;
}

// components/CreateOrgDialog.tsx (CLIENT)
"use client";
export function CreateOrgDialog() {
  const [open, setOpen] = useState(false);
  // ... interactive logic
}
```

---

### Decision 2: Form Validation Library

**Choice**: React Hook Form + Zod

**Rationale**:
- Already used in existing codebase (consistent with sign-up forms)
- Zod schema validation integrates with Better Auth expectations
- Type-safe form inputs (TypeScript autocomplete)
- Built-in error handling and async validation

**Implementation**:
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const orgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(50),
  logo: z.instanceof(File).optional(),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(orgSchema),
});
```

---

### Decision 3: Real-Time Slug Availability Check

**Choice**: Debounced API call to check slug uniqueness

**Rationale**:
- Better UX: User knows immediately if slug is taken (vs. error on submit)
- Performance: Debounced (500ms) to avoid excessive API calls
- Backend support: Better Auth provides slug uniqueness constraint

**Implementation**:
```typescript
const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

const checkSlugAvailability = useMemo(
  () =>
    debounce(async (slug: string) => {
      const available = await authClient.organization.checkSlugAvailability({ slug });
      setSlugAvailable(available);
    }, 500),
  []
);

useEffect(() => {
  if (slug.length >= 2) {
    checkSlugAvailability(slug);
  }
}, [slug]);
```

---

### Decision 4: Image Upload Strategy

**Choice**: Database storage (base64) for MVP

**Rationale**:
- Aligns with spec Decision 3: Database storage for MVP
- No additional infrastructure (S3, R2, CDN) required
- 2MB limit prevents database bloat
- Migration path to cloud storage documented for Phase 2

**Monitoring Triggers** (migrate if exceeded):
- Database size: >500MB attributed to logo storage
- Image serving latency: p95 >100ms
- Expected scale: >1000 organizations with logos

---

### Decision 5: Pagination Strategy

**Choice**: Server-side pagination with 50 items per page

**Rationale**:
- Better Auth supports pagination params (`limit`, `offset`)
- Database query performance: Fetch only needed rows
- Client performance: Render only 50 rows at a time (fast DOM updates)
- SEO-friendly: Paginated URLs (e.g., `/members?page=2`)

**Implementation**:
```typescript
const { data: members } = await authClient.organization.listMembers({
  organizationId: params.orgId,
  limit: 50,
  offset: (page - 1) * 50,
});
```

---

### Decision 6: Optimistic UI for Org Switching

**Choice**: Update UI immediately, rollback on failure

**Rationale**:
- Success Criteria SC-003: Switching must feel instant (<2s)
- Network latency can delay API response
- Optimistic update improves perceived performance
- Rollback ensures UI stays in sync with backend on errors

**Implementation**:
```typescript
const [localActiveOrg, setLocalActiveOrg] = useState(activeOrg);

const switchOrg = async (orgId: string) => {
  setLocalActiveOrg(orgId); // Optimistic update

  try {
    await authClient.organization.setActive({ organizationId: orgId });
  } catch (error) {
    setLocalActiveOrg(activeOrg); // Rollback
    toast.error("Failed to switch organization");
  }
};
```

---

## 12. Risk Analysis & Mitigation

### Risk 1: Rate Limit UX Confusion

**Risk**: Users hit 5 invitations/hour limit without understanding why

**Impact**: Support tickets, user frustration

**Mitigation**:
- Display remaining invitations count in invite dialog
- Show clear error message when rate limit hit: "Rate limit exceeded. You can send 5 invitations per hour. Try again in 45 minutes."
- Pre-validation: Disable "Send Invitation" button if rate limit reached

**Implementation**:
```typescript
const { data: rateLimitInfo } = useInvitationRateLimit(orgId);

<InviteMemberDialog>
  <p className="text-sm text-muted-foreground">
    {rateLimitInfo.remaining}/5 invitations remaining this hour
  </p>
  <Button disabled={rateLimitInfo.remaining === 0}>
    Send Invitation
  </Button>
</InviteMemberDialog>
```

---

### Risk 2: Slug Collision During Auto-Generation

**Risk**: User creates org "AI Lab" → slug "ai-lab" → collision with existing org

**Impact**: Form submission error, user must retry

**Mitigation**:
- Real-time slug availability check (Decision 3)
- Auto-increment slug if collision: "ai-lab" → "ai-lab-2"
- Clear error message: "Slug 'ai-lab' is taken. Try 'ai-lab-2' or choose your own."

**Implementation**:
```typescript
const generateUniqueSlug = async (baseName: string) => {
  let slug = sanitizeSlug(baseName);
  let attempt = 1;

  while (!(await checkSlugAvailability(slug))) {
    slug = `${sanitizeSlug(baseName)}-${attempt}`;
    attempt++;
  }

  return slug;
};
```

---

### Risk 3: Large Organization (1000+ Members) Performance

**Risk**: Member list with 1000+ members causes slow page load

**Impact**: Poor UX, potential timeout

**Mitigation**:
- Server-side pagination (50 per page)
- Virtual scrolling for large lists (react-window)
- Search/filter on backend (Postgres full-text search)
- Loading skeletons during fetch

**Monitoring**:
- Alert if p95 member list load time >1 second
- Track average members per organization
- Proactively optimize if orgs regularly exceed 500 members

---

### Risk 4: Organization Deletion Errors

**Risk**: Deleting org with 1000+ members times out or partially fails

**Impact**: Orphaned data, inconsistent state

**Mitigation**:
- Cascade delete in database (FK constraints on `organization.id`)
- Better Auth handles member removal automatically
- Transaction-wrapped deletion (all or nothing)
- For large orgs (>1000 members): Async job with progress bar

**Implementation**:
```typescript
// Database schema ensures cascade delete
organizationId: text("organization_id")
  .notNull()
  .references(() => organization.id, { onDelete: "cascade" })

// For large orgs, use async job
const deleteOrg = async (orgId: string) => {
  const memberCount = await getMemberCount(orgId);

  if (memberCount > 1000) {
    // Queue background job
    await queueOrgDeletion(orgId);
    toast.info("Deletion in progress. This may take a few minutes.");
  } else {
    // Immediate deletion
    await authClient.organization.delete({ organizationId: orgId });
    toast.success("Organization deleted successfully");
  }
};
```

---

### Risk 5: JWT Claim Staleness After Org Switch

**Risk**: User switches org, but connected OAuth clients still see old `tenant_id`

**Impact**: Access to wrong organization's data

**Mitigation**:
- Better Auth handles JWT regeneration automatically on `setActive()`
- OAuth clients refresh token immediately after switch
- Frontend shows "Switching organizations..." loading state
- Document in integration guide: "Clients must refresh tokens after org switch"

**Verification Test**:
```typescript
test("OAuth client receives updated tenant_id after org switch", async () => {
  // Switch org
  await authClient.organization.setActive({ organizationId: "org_2" });

  // Force token refresh (OAuth client behavior)
  const newToken = await oauthClient.refreshToken();
  const claims = decodeJWT(newToken);

  expect(claims.tenant_id).toBe("org_2");
});
```

---

## 13. Success Metrics & Validation

### 13.1 Functional Requirements Coverage

**Checklist** (from spec Requirements section):
- [ ] FR-001: Display all user's organizations with details ✅
- [ ] FR-002: Switch active organization ✅
- [ ] FR-003: Create new organizations ✅
- [ ] FR-004: Auto-generate slug ✅
- [ ] FR-005: Assign creator as owner ✅
- [ ] FR-006: Invite members via email ✅
- [ ] FR-007: Send invitation email ✅
- [ ] FR-008: Invitation acceptance page ✅
- [ ] FR-009: Add user to org on acceptance ✅
- [ ] FR-010: Cancel pending invitations ✅
- [ ] FR-011: Resend invitations ✅
- [ ] FR-012: Expire invitations after 48 hours ✅
- [ ] FR-013: Paginated member list ✅
- [ ] FR-014: Change member roles ✅
- [ ] FR-015: Remove members ✅
- [ ] FR-016: Members can leave org ✅
- [ ] FR-017: Prevent zero owners ✅
- [ ] FR-018: Member search/filter ✅
- [ ] FR-019: Update org settings ✅
- [ ] FR-020: Validate slug uniqueness ✅
- [ ] FR-021: Slug redirect (30 days) ⚠️ (Backend feature - not in UI scope)
- [ ] FR-022: Delete organization ✅
- [ ] FR-023: Transfer ownership ✅
- [ ] FR-024: Remove all members on delete ✅
- [ ] FR-025: Admin org list ✅
- [ ] FR-026: Admin org details ✅
- [ ] FR-027: Admin bulk operations ✅
- [ ] FR-028: Audit log for admin actions ✅
- [ ] FR-029: Profile shows active org ✅
- [ ] FR-030: Profile quick switcher ✅
- [ ] FR-031: RBAC enforcement ✅
- [ ] FR-032: Hide features from non-owners/admins ✅
- [ ] FR-033: Validate ownership before operations ✅
- [ ] FR-034: Rate limit invitations (5/hour) ✅
- [ ] FR-035: Validate email format ✅
- [ ] FR-036: Prevent duplicate member invites ✅
- [ ] FR-037: Validate image uploads ✅
- [ ] FR-038: Sanitize slugs (XSS prevention) ✅
- [ ] FR-039: Validate org name length ✅
- [ ] FR-040: Use Better Auth client methods ✅
- [ ] FR-041: Use Better Auth hooks ✅
- [ ] FR-042: Call setActive() for switching ✅
- [ ] FR-043: JWT claims update on switch ✅

**Total**: 42/43 requirements (FR-021 is backend-only)

---

### 13.2 Success Criteria Validation

**Performance** (from spec Success Criteria):
- [ ] SC-001: Org creation <60 seconds (measure in E2E test) ✅
- [ ] SC-002: Invitation acceptance <30 seconds (E2E test) ✅
- [ ] SC-003: Org switching <2 seconds (Performance test) ✅
- [ ] SC-004: Member list (100 members) <1 second (Performance test) ✅
- [ ] SC-005: Email delivery 95% within 5 minutes (Monitor email service metrics) ⚠️
- [ ] SC-006: 10,000+ orgs support (Virtual scrolling if needed) ✅
- [ ] SC-007: Zero XSS vulnerabilities (Security scan) ✅
- [ ] SC-008: Admin bulk ops <30 seconds (100 orgs) ✅
- [ ] SC-009: Slug collision prevention 100% (Database constraint + validation) ✅
- [ ] SC-010: 85% first-attempt success rate (Track analytics) ⚠️
- [ ] SC-011: Auto-save 99.9% success (Track save failures) ⚠️
- [ ] SC-012: Invitation expiry 100% enforcement (Better Auth handles) ✅

**UX** (from spec Success Criteria):
- [ ] SC-013: Satisfaction 4.5/5 (In-app survey after 30 days) ⚠️
- [ ] SC-014: Support tickets -60% (Baseline vs 30-day post-launch) ⚠️
- [ ] SC-015: 80% invitations accepted within 24 hours (Track lag time) ⚠️

**Legend**:
- ✅ = Implementation covers
- ⚠️ = Requires post-launch monitoring/analytics

---

### 13.3 Test Coverage Goals

**Unit Tests**: 80%+ coverage
- All utility functions (slug validation, email validation)
- All components (OrganizationCard, CreateOrgDialog, MemberList)
- All hooks (useOrganizations, useOrgSwitcher)

**Integration Tests**: 20+ scenarios
- Org creation flow (E2E)
- Invitation flow (invite → email → accept)
- Member management (role change, removal)
- Permission enforcement (member cannot access settings)
- Error handling (rate limit, network errors)

**Performance Tests**: 5 key metrics
- Org switching <2s
- Member list load <1s
- Org creation <60s
- Invitation acceptance <30s
- Admin bulk ops <30s

---

## 14. Documentation & Handoff

### 14.1 Developer Documentation

**README Updates** (add to project README.md):
```markdown
## Organizations Feature

**User Guide**: See `docs/organizations-user-guide.md`
**API Reference**: See `docs/organizations-api.md`
**Integration**: See `docs/organizations-integration.md`

### Quick Start

1. Enable organizations in `.env`:
   ```
   # Already enabled in auth.ts:630
   ```

2. Create your first organization:
   ```
   Visit /account/organizations → "Create Organization"
   ```

3. Invite team members:
   ```
   Org Settings → Members → "Invite Member"
   ```
```

**API Documentation** (create `docs/organizations-api.md`):
- List all Better Auth organization methods
- Example requests/responses
- Error codes and handling
- Rate limit documentation

**User Guide** (create `docs/organizations-user-guide.md`):
- Screenshots of each workflow
- Step-by-step instructions
- FAQ (common questions from spec edge cases)
- Troubleshooting (rate limits, invitation expiry, etc.)

---

### 14.2 Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing (`pnpm test-all`)
- [ ] Performance tests validate success criteria
- [ ] Security scan shows zero vulnerabilities
- [ ] Email service configured (Resend or SMTP)
- [ ] Database migration run (if schema changes)
- [ ] Default organization seeded (`pnpm seed:prod`)

**Post-Deployment**:
- [ ] Smoke test: Create org, invite member, accept invitation
- [ ] Monitor error rates (should be <1% for org operations)
- [ ] Track email delivery rates (should be >95%)
- [ ] Monitor performance (org switching <2s, member list <1s)
- [ ] Check audit logs for admin operations

**Monitoring Setup**:
- [ ] Alert: Organization creation failure rate >5%
- [ ] Alert: Invitation email delivery rate <95%
- [ ] Alert: Member list load time p95 >1 second
- [ ] Dashboard: Track daily org creations, invitations sent, members added

---

## 15. Future Enhancements (Out of Scope)

**Phase 2 Features** (from spec Non-Goals):
- Multi-organization billing and subscriptions
- Organization-level API keys
- Sub-organizations (Better Auth teams plugin)
- Custom branding per organization
- Organization activity feeds
- Advanced permissions (custom access control statements)
- Resource quotas (max members per org)
- Social login per organization
- Organization onboarding wizard
- Data export (member lists, audit logs)

**Technical Debt to Address**:
- Migrate to cloud storage (R2) if database logo storage exceeds 500MB
- Implement virtual scrolling for orgs/members lists >500 items
- Add Redis caching for frequently accessed org data
- Optimize member list queries with database indexes

---

## 16. Conclusion

This implementation plan provides a complete roadmap for building the Organizations UI feature in 3 phases over 26 hours. The architecture leverages Better Auth's native organization plugin, follows existing Taskflow SSO design patterns, and delivers all 43 functional requirements with comprehensive testing.

**Key Deliverables**:
- 7 user-facing workflows (discovery, creation, invitations, member management, settings, admin panel, profile integration)
- 40+ new components and pages
- Full RBAC enforcement
- Rate limiting and security hardening
- Comprehensive test suite (unit, integration, E2E, performance)

**Next Steps**:
1. Review plan with stakeholders
2. Begin Phase 1 implementation (organization discovery & creation)
3. Set up monitoring and analytics for success criteria
4. Iterate based on user feedback post-launch

---

**Plan Version**: 1.0
**Created**: 2025-12-09
**Author**: Claude (Sonnet 4.5)
**Approval**: Pending stakeholder review
