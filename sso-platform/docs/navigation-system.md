# Navigation System Implementation

## Overview

A comprehensive, context-aware navigation system for the Taskflow SSO platform that provides persistent navigation with organization context, user menus, and mobile responsiveness.

## Components Created

### 1. Main Navbar (`src/components/layout/Navbar.tsx`)
**Type**: Server Component
**Description**: Main navigation bar with organization context and user menu

**Features**:
- Server-side session and organization data fetching
- Displays active organization context
- Shows organization count badge
- Desktop and mobile layouts
- Admin panel link (conditional on user role)
- Automatic minimal navbar for unauthenticated users

**Props**: None (fetches data server-side)

**Key Functionality**:
- Fetches user session via Better Auth
- Loads all user organizations with roles
- Identifies active organization from session
- Renders different UI for authenticated vs unauthenticated states

---

### 2. Organization Switcher (`src/components/layout/OrgSwitcherDropdown.tsx`)
**Type**: Client Component
**Description**: Dropdown for switching between user's organizations

**Features**:
- Search/filter organizations
- Active organization highlighted with checkmark
- Quick actions: "Manage Organizations", "Create Organization"
- Role display under organization name
- Organization logo/initials display
- Smooth organization switching with router refresh

**Props**:
```typescript
interface OrgSwitcherDropdownProps {
  activeOrg: Organization | null;
  organizations: Organization[];
  userRole?: string | null;
}
```

**Key Functionality**:
- Uses Better Auth's `organization.setActive()` to switch organizations
- Client-side search filtering
- Graceful fallback when no active organization

---

### 3. User Menu (`src/components/layout/UserMenu.tsx`)
**Type**: Client Component
**Description**: User dropdown menu with profile and sign-out

**Features**:
- User avatar with fallback to initials
- User name, email, and active organization display
- Admin badge for admin users
- Quick links to Profile and Organizations
- Admin Panel link (conditional)
- Sign out functionality

**Props**:
```typescript
interface UserMenuProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
  activeOrgName?: string | null;
}
```

**Key Functionality**:
- Displays user information
- Conditional admin features
- Sign out with redirect to sign-in page

---

### 4. Mobile Navigation (`src/components/layout/MobileNav.tsx`)
**Type**: Client Component
**Description**: Mobile hamburger menu with slide-out drawer

**Features**:
- Hamburger menu icon (visible only on mobile)
- Slide-out sheet drawer
- User profile display at top
- All navigation links
- Admin panel link (conditional)
- Sign out button

**Props**:
```typescript
interface MobileNavProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
  activeOrgName?: string | null;
}
```

**Key Functionality**:
- Responsive drawer with shadcn/ui Sheet component
- Auto-closes on navigation
- Active link highlighting

---

### 5. NavLink (`src/components/layout/NavLink.tsx`)
**Type**: Client Component
**Description**: Navigation link with active state highlighting

**Features**:
- Automatic active state detection
- Hover effects
- Consistent styling

**Props**:
```typescript
interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}
```

**Key Functionality**:
- Uses Next.js `usePathname()` for active detection
- Supports nested routes (e.g., `/account/organizations/*`)

---

## Integration

### Updated Files

#### `src/app/account/layout.tsx`
**Before**: Separate header with logo + AccountNav component
**After**: Single Navbar component that handles everything

**Changes**:
- Removed duplicate header
- Removed AccountNav import
- Added Navbar import
- Simplified layout structure

**Benefits**:
- Single source of truth for navigation
- Consistent navigation across all account pages
- Automatic organization context

---

## Dependencies Installed

```bash
pnpm add lucide-react              # Icon library
pnpm dlx shadcn@latest add sheet   # Mobile drawer component
pnpm dlx shadcn@latest add separator  # UI separator
```

**Existing UI Components Used**:
- `dropdown-menu` (already installed)
- `avatar` (already installed)
- `badge` (already installed)
- `button` (already installed)
- `input` (already installed)

---

## File Structure

```
src/components/layout/
├── Navbar.tsx                  # Main navbar (Server Component)
├── OrgSwitcherDropdown.tsx    # Org switcher (Client Component)
├── UserMenu.tsx               # User dropdown (Client Component)
├── MobileNav.tsx              # Mobile navigation (Client Component)
└── NavLink.tsx                # Active link component (Client Component)
```

---

## Key Features

### 1. Organization Context Awareness
- Always displays active organization in navbar
- Shows user's role in that organization
- Quick switcher for changing organizations
- Badge showing total organization count

### 2. Role-Based UI
- Admin badge displayed for admin users
- Admin Panel link only visible to admins
- Conditional features based on user role

### 3. Mobile Responsiveness
- Desktop: Full navbar with all features
- Mobile: Hamburger menu with slide-out drawer
- Responsive breakpoint: `md` (768px)

### 4. Server-Side Rendering
- Main Navbar is a Server Component
- Fetches session and organization data server-side
- No client-side loading states for initial render
- Better SEO and performance

### 5. Graceful Degradation
- Unauthenticated users see minimal navbar
- Users without organizations see fallback UI
- Missing avatars show initials
- Missing logos show organization initials

---

## Navigation Items

### Desktop Navigation
1. **Organizations** - Badge with count
2. **Profile**
3. **Admin Panel** (admin only)

### Mobile Navigation
Same as desktop, plus:
- User profile section at top
- Sign out button at bottom

### Organization Switcher
- All user's organizations
- Search functionality
- Quick actions:
  - Manage Organizations
  - Create Organization

### User Menu
- User info (name, email, active org)
- Profile link
- Organizations link
- Admin Panel (admin only)
- Sign Out

---

## Testing Checklist

### Manual Testing

#### As Regular User
- [ ] Navbar visible on all `/account/*` pages
- [ ] Active organization displayed correctly
- [ ] Organization switcher dropdown works
- [ ] Switching organizations updates active badge
- [ ] User menu shows correct info
- [ ] Sign out redirects to `/auth/sign-in`
- [ ] Mobile hamburger menu works
- [ ] Active link highlighted correctly

#### As Admin User
- [ ] Admin badge visible in user menu
- [ ] Admin Panel link visible in desktop nav
- [ ] Admin Panel link visible in mobile nav
- [ ] Admin Panel accessible via both

#### Unauthenticated User
- [ ] Minimal navbar with logo and "Sign In" link
- [ ] No errors when accessing protected routes

#### Organization Features
- [ ] Organization count badge accurate
- [ ] Searching organizations works
- [ ] "Create Organization" link works
- [ ] "Manage Organizations" link works
- [ ] Active organization marked with checkmark

#### Mobile Responsiveness
- [ ] Hamburger menu visible on mobile (<768px)
- [ ] Desktop navigation hidden on mobile
- [ ] Drawer opens/closes smoothly
- [ ] Navigation closes on link click
- [ ] All features accessible on mobile

---

## Browser Testing

Test in the following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance Considerations

### Server Components
- Main Navbar fetches data server-side
- No client-side loading states
- Better initial page load

### Client Components
- Minimal client-side JavaScript
- Interactive features only where needed
- Efficient re-renders

### Optimizations
- Organization data cached in session
- Database queries optimized with joins
- Avatar images lazy loaded
- Icons tree-shaken (lucide-react)

---

## Accessibility

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space to open dropdowns
- [ ] Escape to close dropdowns/drawer
- [ ] Arrow keys in dropdown menus

### Screen Readers
- [ ] Proper ARIA labels
- [ ] Semantic HTML structure
- [ ] Focus management in drawers
- [ ] Announce active organization changes

### Visual
- [ ] Sufficient color contrast
- [ ] Focus indicators visible
- [ ] Text readable at 200% zoom
- [ ] Icons supplemented with text

---

## Future Enhancements

### Planned Features
1. **Organization Quick Create** - Modal for creating org from navbar
2. **Notification Bell** - Organization invitations, announcements
3. **Command Palette** - Keyboard shortcuts for navigation
4. **Recent Organizations** - Quick access to recently visited orgs
5. **Organization Favorites** - Pin frequently used organizations
6. **Search All** - Global search across organizations and resources

### Technical Improvements
1. **Optimistic UI** - Instant feedback when switching organizations
2. **Prefetching** - Preload organization data on hover
3. **Virtualization** - Handle users with 100+ organizations
4. **Caching Strategy** - Client-side cache for organization list
5. **Analytics** - Track navigation patterns for UX improvements

---

## Troubleshooting

### Organization Switcher Not Updating
**Issue**: Active organization not changing after switch
**Solution**: Check that `router.refresh()` is called after `organization.setActive()`

### Mobile Menu Not Closing
**Issue**: Drawer stays open after navigation
**Solution**: Ensure `onClick={() => setIsOpen(false)}` on all nav links

### Admin Panel Not Visible
**Issue**: Admin users not seeing Admin Panel link
**Solution**: Verify `user.role === "admin"` in database

### Avatar Not Loading
**Issue**: User images not displaying
**Solution**: Check CORS settings for image URLs, ensure fallback initials work

### TypeScript Errors
**Issue**: Type errors on organization objects
**Solution**: Use `typeof userOrgs[number]` for inferred types from Drizzle queries

---

## API Reference

### Better Auth Methods Used

```typescript
// Get session
auth.api.getSession({ headers: await headers() })

// Switch organization
organization.setActive({ organizationId: string })

// Sign out
signOut()
```

### Database Queries

```typescript
// Fetch user's organizations with roles
db
  .select({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo,
    userRole: member.role,
  })
  .from(organization)
  .innerJoin(member, eq(member.organizationId, organization.id))
  .where(eq(member.userId, userId))
```

---

## Design System

### Colors
- Primary: `taskflow-600` (Blue)
- Text: `slate-900`, `slate-600`, `slate-500`
- Admin: `purple-100`, `purple-700`
- Destructive: `red-600`

### Spacing
- Navbar height: `h-16` (64px)
- Padding: `px-4` (16px horizontal)
- Gap between items: `gap-3`, `gap-4`

### Typography
- Navbar links: `text-sm font-medium`
- User name: `font-semibold`
- Email: `text-xs text-slate-500`

### Borders
- Navbar: `border-b shadow-sm`
- Dropdowns: Default shadcn/ui styling
- Mobile drawer: Default Sheet styling

---

## Development Workflow

### Making Changes
1. Edit component in `src/components/layout/`
2. Type check: `pnpm tsc --noEmit`
3. Build: `pnpm build`
4. Test manually in browser
5. Commit with descriptive message

### Adding New Navigation Item
1. Add to desktop nav in `Navbar.tsx`
2. Add to mobile nav in `MobileNav.tsx`
3. Ensure active state detection works
4. Test both desktop and mobile
5. Update this documentation

### Adding New Organization Action
1. Add menu item to `OrgSwitcherDropdown.tsx`
2. Implement handler function
3. Test organization context is preserved
4. Handle errors gracefully
5. Add loading states if async

---

## Related Documentation

- [Organization System](./organization-system.md)
- [Better Auth Integration](./integration-guide.md)
- [UI Component Library](./ui-components.md)
- [Mobile Responsiveness](./responsive-design.md)

---

## Credits

**Created**: December 9, 2025
**Components**: 5 new components
**Dependencies**: lucide-react, shadcn/ui (sheet, separator)
**Design System**: Tailwind CSS + shadcn/ui
**Framework**: Next.js 15 + Better Auth
