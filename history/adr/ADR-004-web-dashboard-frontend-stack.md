# ADR-004: Web Dashboard Frontend Stack

- **Status:** Accepted
- **Date:** 2025-12-07
- **Feature:** 004-web-dashboard
- **Context:** specs/004-web-dashboard/spec.md

## Decision

Built the web dashboard using Next.js 15 App Router with shadcn/ui components and Tailwind CSS, implementing OAuth 2.1 PKCE flow against the SSO platform. The UI emphasizes human-agent parity by displaying workers uniformly regardless of type.

**Technology Stack:**
- **Framework**: Next.js 15 with App Router (over Pages Router or Remix)
- **UI Components**: shadcn/ui with Radix primitives
- **Styling**: Tailwind CSS with Industrial-Kinetic Futurism (IFK) theme
- **Auth Flow**: OAuth 2.1 PKCE via Better Auth SSO
- **API Integration**: REST calls to FastAPI backend on port 8000

**Authentication Pattern:**
- OAuth 2.1 PKCE flow (no client secrets in browser)
- Token storage in browser (localStorage or sessionStorage)
- Automatic token refresh on expiration
- Protected routes redirect to SSO login

**Agent Parity in UI:**
- Single assignment dropdown shows both humans (👤) and agents (🤖)
- Unified members list with type indicators
- Identical task cards regardless of assignee type
- Audit trail displays actor with type badge

**Design Decisions:**
- Desktop-first (mobile responsive is non-goal for Phase II)
- No real-time WebSocket updates (refresh-based)
- Theme assets reused from SSO platform for visual consistency

## Consequences

### Positive
- App Router enables server components for faster initial load
- shadcn/ui provides unstyled primitives that match IFK theme
- OAuth PKCE eliminates backend token exchange complexity
- Unified worker UI demonstrates human-agent parity visually
- Component library reuse from SSO reduces development time

### Negative
- Next.js 15 App Router has breaking changes from Pages Router patterns
- No real-time updates means users must refresh to see others' changes
- Desktop-first means mobile experience is degraded
- OAuth PKCE tokens in browser are vulnerable to XSS (mitigated by httpOnly cookies)

## Alternatives Considered

### Alternative A: Remix with Clerk Auth
- Pros: Built-in loaders/actions, excellent DX, managed auth
- Cons: Less Next.js ecosystem compatibility, additional auth provider
- Why rejected: Next.js provides better compatibility with existing SSO platform patterns

### Alternative B: Next.js Pages Router with NextAuth
- Pros: Stable patterns, extensive documentation, built-in auth
- Cons: Server-first auth conflicts with custom SSO, pages router is legacy
- Why rejected: App Router is the future; custom SSO already exists

### Alternative C: React SPA with Vite + React Router
- Pros: Simpler architecture, no SSR complexity, faster dev server
- Cons: No server-side rendering, separate deployment, less SEO
- Why rejected: Next.js provides better full-stack integration and deployment options

## UI Design Patterns

**Human-Agent Parity Display:**
```typescript
// Same dropdown for all workers
<Select>
  {members.map(member => (
    <SelectItem key={member.id}>
      {member.type === 'agent' ? '🤖' : '👤'} {member.handle}
    </SelectItem>
  ))}
</Select>
```

**Protected Route Pattern:**
```typescript
// Middleware checks auth, redirects to SSO
if (!session) {
  redirect(`${SSO_URL}/oauth2/authorize?...`)
}
```

## References
- Spec: specs/004-web-dashboard/spec.md
- Plan: specs/004-web-dashboard/plan.md
- Theme: IFK (Industrial-Kinetic Futurism) from sso-platform
- Key patterns: OAuth PKCE, shadcn/ui, unified worker display
