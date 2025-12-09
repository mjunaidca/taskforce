# Navigation System - Quick Start Guide

## For Developers

### Running the Project

```bash
# Start development server
pnpm dev

# Navigate to:
http://localhost:3001
```

### Testing the Navigation

1. **Sign In**: Go to `/auth/sign-in`
2. **View Organizations**: Click "Organizations" in navbar
3. **Switch Organization**: Click active org dropdown, select different org
4. **Access Profile**: Click user avatar → "Profile"
5. **Test Mobile**: Resize browser to <768px, click hamburger menu

### Checking Your Build

```bash
# Type check
pnpm tsc --noEmit

# Build production bundle
pnpm build

# Run linter
pnpm lint
```

### Common Tasks

#### Add a Navigation Link

**Desktop** (`src/components/layout/Navbar.tsx`):
```tsx
<NavLink href="/account/settings">Settings</NavLink>
```

**Mobile** (`src/components/layout/MobileNav.tsx`):
```tsx
{
  href: "/account/settings",
  label: "Settings",
  icon: Settings,  // from lucide-react
}
```

#### Make a Link Admin-Only

```tsx
{isAdmin && (
  <NavLink href="/admin/dashboard">Dashboard</NavLink>
)}
```

#### Add Organization Quick Action

In `OrgSwitcherDropdown.tsx`:
```tsx
<DropdownMenuItem asChild>
  <Link href="/account/organizations/new">
    <Plus className="w-4 h-4" />
    New Feature
  </Link>
</DropdownMenuItem>
```

### File Locations

```
src/components/layout/
├── Navbar.tsx              ← Main navbar (edit for desktop)
├── MobileNav.tsx           ← Mobile menu (edit for mobile)
├── OrgSwitcherDropdown.tsx ← Org switcher (edit for org features)
├── UserMenu.tsx            ← User menu (edit for user actions)
└── NavLink.tsx             ← Active link (rarely edit)

src/app/account/layout.tsx  ← Uses <Navbar />
```

### Debugging Tips

#### Navbar Not Showing
- Check if `<Navbar />` is in your layout
- Verify you're inside `/account/*` route
- Check browser console for errors

#### Organization Not Switching
- Check browser network tab for API calls
- Verify `router.refresh()` is called
- Check Better Auth session is valid

#### Admin Link Not Visible
- Check database: `SELECT role FROM user WHERE email = '...'`
- Verify role is exactly `"admin"` (lowercase)
- Clear browser cookies and sign in again

#### Mobile Menu Not Working
- Check browser width is <768px
- Verify Sheet component is installed
- Check console for React errors

### Quick Fixes

#### Clear Session
```typescript
// In browser console
await authClient.signOut()
```

#### Force Organization Refresh
```typescript
// In browser console
window.location.reload()
```

#### Check Active Organization
```typescript
// In browser console
const session = await authClient.getSession()
console.log(session.session.activeOrganizationId)
```

### Development Workflow

1. **Edit Component** - Make your changes
2. **Hot Reload** - See changes instantly (Next.js HMR)
3. **Test Manually** - Click through UI
4. **Check Types** - `pnpm tsc --noEmit`
5. **Build** - `pnpm build`
6. **Commit** - Git commit with message

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `session is undefined` | No auth session | Sign in first |
| `activeOrg is null` | No organizations | Create one at `/account/organizations` |
| `role is undefined` | Old session | Sign out and sign in again |
| `Type error on org` | Missing type annotation | Use `typeof userOrgs[number]` |
| `Sheet not found` | Missing component | `pnpm dlx shadcn@latest add sheet --yes` |

### Component Props Reference

#### Navbar
```typescript
// No props - fetches data server-side
<Navbar />
```

#### OrgSwitcherDropdown
```typescript
<OrgSwitcherDropdown
  activeOrg={{
    id: string,
    name: string,
    slug: string,
    logo: string | null
  } | null}
  organizations={Array<{
    id: string,
    name: string,
    slug: string,
    logo: string | null
  }>}
  userRole={string | null}
/>
```

#### UserMenu
```typescript
<UserMenu
  user={{
    name: string,
    email: string,
    image: string | null,
    role: string | null
  }}
  activeOrgName={string | null}
/>
```

#### MobileNav
```typescript
<MobileNav
  user={{
    name: string,
    email: string,
    image: string | null,
    role: string | null
  }}
  activeOrgName={string | null}
/>
```

### Icons Reference

Available from `lucide-react`:
- `Building2` - Organizations
- `User` - Profile
- `Shield` - Admin
- `Menu` - Hamburger
- `X` - Close
- `LogOut` - Sign out
- `Check` - Active indicator
- `ChevronDown` - Dropdown
- `Plus` - Add/Create
- `Settings` - Settings/Manage

Usage:
```tsx
import { Building2 } from "lucide-react"

<Building2 className="w-4 h-4" />
```

### Styling Reference

#### Colors
```tsx
// Primary
className="text-taskflow-600 bg-taskflow-50"

// Admin
className="bg-purple-100 text-purple-700"

// Error/Destructive
className="text-red-600 hover:bg-red-50"

// Text
className="text-slate-900"  // Primary text
className="text-slate-600"  // Secondary text
className="text-slate-500"  // Tertiary text
```

#### Spacing
```tsx
// Gaps
className="gap-2"  // 8px
className="gap-3"  // 12px
className="gap-4"  // 16px

// Padding
className="px-3 py-2"  // Navbar links
className="px-4 py-3"  // Mobile nav items
```

#### Sizing
```tsx
// Icons
className="w-4 h-4"  // Small (16px)
className="w-5 h-5"  // Medium (20px)

// Avatar
className="h-6 w-6"  // Navbar (24px)
className="h-8 w-8"  // User menu (32px)
className="h-16 w-16"  // Mobile drawer (64px)

// Navbar
className="h-16"  // 64px height
```

### Environment Variables

Required for navigation:
```env
# Better Auth
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=your-secret-here

# Database
DATABASE_URL=postgresql://...

# App Info (for branding)
NEXT_PUBLIC_APP_NAME=Taskflow SSO
NEXT_PUBLIC_ORG_NAME=Taskflow
```

### Database Setup

Ensure you have organizations:
```sql
-- Check if user has organizations
SELECT o.name, m.role
FROM organization o
JOIN member m ON m.organization_id = o.id
WHERE m.user_id = 'your-user-id';

-- Create an organization for testing
INSERT INTO organization (id, name, slug, created_at)
VALUES (
  'org_test123',
  'Test Organization',
  'test-org',
  NOW()
);

-- Add user as owner
INSERT INTO member (id, user_id, organization_id, role, created_at)
VALUES (
  'mem_test123',
  'your-user-id',
  'org_test123',
  'owner',
  NOW()
);
```

### Testing Checklist

Before committing:
- [ ] Desktop nav works
- [ ] Mobile nav works
- [ ] Organization switching works
- [ ] User menu works
- [ ] Sign out works
- [ ] Admin features (if admin)
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Responsive at all breakpoints

### Performance Tips

1. **Minimize Client Components**: Keep Server Components where possible
2. **Use Proper Types**: Avoid `any` types for better tree-shaking
3. **Optimize Images**: Use Next.js `<Image>` for avatars/logos
4. **Cache Organization Data**: Already done server-side
5. **Lazy Load Icons**: lucide-react already tree-shakes

### Best Practices

✅ **Do**:
- Use Server Components for static parts
- Keep client state minimal
- Handle errors gracefully
- Provide fallbacks (initials for avatars)
- Use semantic HTML
- Add proper ARIA labels

❌ **Don't**:
- Fetch data in Client Components
- Store session in useState
- Hardcode organization IDs
- Skip error handling
- Remove fallback UI
- Use inline styles

### Resources

- [Better Auth Docs](https://www.better-auth.com)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Next.js 15 Docs](https://nextjs.org/docs)

### Getting Help

1. **Check Console**: Browser console + terminal
2. **Check Types**: Run `pnpm tsc --noEmit`
3. **Check Build**: Run `pnpm build`
4. **Check Docs**: This file + navigation-system.md
5. **Check Code**: Read component source code

### Quick Reference

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Type check
pnpm tsc --noEmit

# Build production
pnpm build

# Run linter
pnpm lint

# Add shadcn component
pnpm dlx shadcn@latest add [component]

# Database
pnpm db:push    # Push schema
pnpm db:studio  # View database
```

### Next Steps

1. Sign in to your app
2. Create an organization
3. Test navigation flows
4. Customize components for your needs
5. Add your own navigation items
6. Deploy to production

**Happy coding!** 🚀
