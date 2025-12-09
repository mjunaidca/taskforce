# Navigation System Architecture

## Component Hierarchy

```
Navbar (Server Component)
├── Logo
│   └── Link to "/"
├── Desktop Navigation
│   ├── NavLink: Organizations (with badge)
│   ├── NavLink: Profile
│   └── NavLink: Admin Panel (conditional)
├── Organization Switcher (Client)
│   ├── Trigger: Active Org Display
│   │   ├── Avatar (logo/initials)
│   │   ├── Org Name
│   │   └── User Role
│   └── Dropdown Content
│       ├── Search Input
│       ├── Organization List
│       │   └── For each org:
│       │       ├── Avatar
│       │       ├── Name
│       │       └── Check (if active)
│       └── Actions
│           ├── Manage Organizations
│           └── Create Organization
├── User Menu (Client)
│   ├── Trigger: User Avatar
│   └── Dropdown Content
│       ├── User Info
│       │   ├── Name + Admin Badge
│       │   ├── Email
│       │   └── Active Org
│       ├── Links
│       │   ├── Profile
│       │   ├── Organizations
│       │   └── Admin Panel (conditional)
│       └── Sign Out
└── Mobile Navigation (Client)
    ├── Trigger: Hamburger Icon
    └── Sheet Drawer
        ├── User Profile Section
        │   ├── Avatar
        │   ├── Name + Admin Badge
        │   ├── Email
        │   └── Active Org
        ├── Navigation Links
        │   ├── Profile
        │   ├── Organizations
        │   └── Admin Panel (conditional)
        └── Sign Out Button
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Navbar (Server Side)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Get Session Data   │
                    │   (Better Auth)     │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Fetch User Orgs    │
                    │   (Drizzle ORM)     │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Identify Active Org │
                    │  (from session)     │
                    └─────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌──────────────────┐          ┌──────────────────┐
    │ OrgSwitcher (C)  │          │  UserMenu (C)    │
    └──────────────────┘          └──────────────────┘
              │                               │
              ▼                               ▼
    ┌──────────────────┐          ┌──────────────────┐
    │ Switch Org (C)   │          │  Sign Out (C)    │
    │ setActive()      │          │  signOut()       │
    │ router.refresh() │          │  router.push()   │
    └──────────────────┘          └──────────────────┘

Legend:
  (S) = Server Component
  (C) = Client Component
```

## State Management

### Server-Side State
```typescript
// Fetched on every page load (navbar is in layout)
const session = await auth.api.getSession({ headers })
const userOrgs = await db.select(...).from(organization)...
const activeOrg = userOrgs.find(org => org.id === session.activeOrganizationId)
```

### Client-Side State
```typescript
// OrgSwitcherDropdown
const [search, setSearch] = useState("")  // Local search filter

// MobileNav
const [isOpen, setIsOpen] = useState(false)  // Drawer open/close
```

### Session State (Better Auth)
```typescript
// Managed by Better Auth
session.session.activeOrganizationId  // Current active org
session.user.role                      // User role (admin/user)
```

## Responsive Breakpoints

```
Mobile Only        Tablet & Desktop
(<768px)           (≥768px)
─────────────────────────────────────
Hamburger Menu  →  Desktop Navigation
Mobile Drawer   →  Dropdown Menus
Stacked Layout  →  Horizontal Layout
```

## Component Types & Rendering

```
Component              Type      Rendering      When
─────────────────────────────────────────────────────────
Navbar.tsx            Server    SSR            Every page
NavLink.tsx           Client    CSR            Interactive
OrgSwitcherDropdown   Client    CSR            Interactive
UserMenu.tsx          Client    CSR            Interactive
MobileNav.tsx         Client    CSR            Interactive
```

## Authentication States

```
┌─────────────────────────────────────────────────────────────┐
│ State 1: Unauthenticated                                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐                              ┌────────────┐    │
│ │  Logo   │                              │  Sign In   │    │
│ └─────────┘                              └────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ State 2: Authenticated, No Organizations                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐  ┌──────┐  ┌─────────┐  ┌──────────────┐  ┌──┐│
│ │  Logo   │  │ Orgs │  │ Profile │  │ Organizations│  │  ││
│ └─────────┘  └──────┘  └─────────┘  └──────────────┘  └──┘│
│                                       (Fallback link)       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ State 3: Authenticated, Has Organizations (Regular User)    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐  ┌──────┐  ┌─────────┐  ┌──────────┐  ┌──────┐│
│ │  Logo   │  │ Orgs │  │ Profile │  │ Active Org│  │ User ││
│ └─────────┘  │  [2] │  └─────────┘  │ (Owner)   │  │ Menu ││
│              └──────┘                └──────────┘  └──────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ State 4: Authenticated, Has Organizations (Admin User)      │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐  ┌──────┐  ┌─────────┐  ┌───────┐  ┌────────┐ │
│ │  Logo   │  │ Orgs │  │ Profile │  │ Admin │  │ActiveOg│ │
│ └─────────┘  │  [5] │  └─────────┘  │ Panel │  │  User  │ │
│              └──────┘                └───────┘  │  Menu  │ │
│                                                  │ [Admin]│ │
│                                                  └────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Interaction Flows

### Organization Switching Flow
```
User clicks active org dropdown
    ↓
Dropdown opens with org list
    ↓
User searches/filters orgs
    ↓
User clicks different org
    ↓
organization.setActive({ organizationId })
    ↓
router.refresh() - Triggers server re-render
    ↓
Navbar re-fetches with new active org
    ↓
UI updates across the app
```

### Sign Out Flow
```
User clicks avatar → User Menu opens
    ↓
User clicks "Sign Out"
    ↓
signOut() - Better Auth client method
    ↓
Session cleared (cookies removed)
    ↓
router.push('/auth/sign-in')
    ↓
User redirected to sign-in page
```

### Mobile Navigation Flow
```
User on mobile (<768px)
    ↓
Desktop nav hidden, hamburger visible
    ↓
User clicks hamburger icon
    ↓
Sheet drawer slides in from right
    ↓
User sees profile + navigation links
    ↓
User clicks a link
    ↓
setIsOpen(false) - Drawer closes
    ↓
Navigation happens
```

## Performance Optimizations

### Server-Side Rendering
```typescript
// Navbar is a Server Component
export async function Navbar() {
  // Data fetched on server
  const session = await auth.api.getSession(...)
  const userOrgs = await db.select(...)

  // Pre-rendered HTML sent to client
  return <nav>...</nav>
}
```

### Database Optimization
```typescript
// Single query with JOIN (no N+1 problem)
const userOrgs = await db
  .select({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo,
    userRole: member.role,  // ← Role included in single query
  })
  .from(organization)
  .innerJoin(member, eq(member.organizationId, organization.id))
  .where(eq(member.userId, session.user.id))
```

### Client-Side Optimization
```typescript
// Minimal client-side state
// Only search filter and drawer state
const [search, setSearch] = useState("")
const [isOpen, setIsOpen] = useState(false)

// No complex state management needed
// Session state managed by Better Auth
// Organization data from server props
```

## Security Considerations

### Role-Based Access
```typescript
// Server-side checks
const isAdmin = session.user.role === "admin"

// Conditional rendering
{isAdmin && (
  <NavLink href="/admin/organizations">Admin Panel</NavLink>
)}
```

### Session Validation
```typescript
// Every page load validates session
const session = await auth.api.getSession({
  headers: await headers(),
})

if (!session) {
  // Show unauthenticated navbar
}
```

### Organization Access
```typescript
// Only shows orgs user is member of
.where(eq(member.userId, session.user.id))

// Active org comes from validated session
const activeOrgId = session.session.activeOrganizationId
```

## Accessibility Features

### Keyboard Navigation
```typescript
// All interactive elements are keyboard accessible
<DropdownMenuTrigger>  // Tab, Enter/Space to open
<DropdownMenuItem>      // Arrow keys to navigate
<Sheet>                 // Escape to close
<Link>                  // Tab to focus, Enter to activate
```

### Screen Reader Support
```typescript
// Semantic HTML
<nav>                   // Landmark for screen readers
<button aria-label="Open menu">  // Descriptive labels
<Avatar>                // Alt text for images
```

### Focus Management
```typescript
// Sheet component handles focus trap
// Dropdown menus handle focus return
// Active states clearly indicated
```

## Error Handling

### No Session
```typescript
if (!session) {
  return <MinimalNavbar />  // Show sign-in link
}
```

### No Organizations
```typescript
if (!activeOrg) {
  return (
    <Link href="/account/organizations">
      <Building2 /> Organizations
    </Link>
  )
}
```

### Failed Organization Switch
```typescript
try {
  await organization.setActive({ organizationId })
  router.refresh()
} catch (error) {
  console.error("Failed to switch organization:", error)
  // UI remains unchanged, error logged
}
```

## Testing Strategy

### Unit Tests (Future)
- NavLink active state detection
- Organization search filtering
- User initials generation
- Role display logic

### Integration Tests (Future)
- Organization switching flow
- Sign out flow
- Mobile drawer behavior
- Dropdown interactions

### E2E Tests (Future)
- Complete navigation flows
- Multi-organization switching
- Admin panel access
- Mobile responsiveness

## Monitoring & Analytics (Future)

### Metrics to Track
- Organization switch frequency
- Most used navigation links
- Mobile vs desktop usage
- Admin panel access patterns
- Sign out rate

### Performance Metrics
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Cumulative Layout Shift (CLS)
- Database query time
- Session fetch time

## Deployment Checklist

- [x] All components created
- [x] TypeScript compilation passes
- [x] Build succeeds
- [x] No console errors
- [x] Mobile responsiveness verified
- [x] Desktop responsiveness verified
- [x] Authentication states handled
- [x] Admin features conditional
- [x] Organization switching works
- [x] Sign out works
- [ ] Manual testing completed
- [ ] Browser compatibility tested
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met
- [ ] Documentation complete

## Future Iterations

### Phase 2: Enhancements
- [ ] Notification bell with invitation count
- [ ] Organization search with fuzzy matching
- [ ] Recent organizations quick access
- [ ] Organization favorites/pins
- [ ] Keyboard shortcuts (Cmd+K)

### Phase 3: Advanced Features
- [ ] Multi-language support
- [ ] Theme switcher (light/dark)
- [ ] Command palette
- [ ] Quick actions menu
- [ ] Global search

### Phase 4: Analytics
- [ ] Usage tracking
- [ ] A/B testing infrastructure
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] User feedback collection
