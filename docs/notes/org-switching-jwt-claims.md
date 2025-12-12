# Organization Switching with JWT Claims in Better Auth

## Problem

When implementing multi-tenant organization switching with Better Auth's OIDC provider, the `getAdditionalUserInfoClaim` function cannot access the user's active organization from the session because:

1. **Better Auth stores sessions in Redis**, not PostgreSQL
2. **`getAdditionalUserInfoClaim` runs during token generation**, which is a back-channel request (no browser context)
3. **The function only receives `(user, scopes, client)`** - no access to session data or request context

This causes org switching to always fall back to the first organization in the user's membership list.

## Failed Approaches

### 1. Query PostgreSQL Session Table
```typescript
// This returns 0 sessions because they're in Redis!
const sessions = await db
  .select()
  .from(schema.session)
  .where(eq(schema.session.userId, user.id));
```

### 2. localStorage
- Client-side only, server can't access it during token generation

### 3. Cookies on SSO domain
- Token endpoint is a back-channel HTTP request, no browser cookies available

### 4. Database schema changes (user.activeOrganizationId)
- Works but requires schema migration
- Adds permanent storage for temporary state

## Solution: Redis as Temporary Context Store

Use Redis to pass the selected organization through the OAuth flow:

### Flow
```
User clicks org → setActive() → POST /api/auth/set-org-context → Redis stores orgId
                                                                        ↓
                               OAuth flow starts ← initiateLogin()
                                                                        ↓
                  getAdditionalUserInfoClaim reads Redis → JWT with correct tenant_id
```

### Implementation

#### 1. SSO Endpoint: `/api/auth/set-org-context`

```typescript
// Store org context in Redis with short TTL
const ORG_CONTEXT_PREFIX = "org_context:";
const ORG_CONTEXT_TTL = 300; // 5 minutes

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { organizationId } = await request.json();

  // Validate user is member of org
  const memberships = await db.select().from(member).where(eq(member.userId, session.user.id));
  const isMember = memberships.some(m => m.organizationId === organizationId);
  if (!isMember) return error(403);

  // Store in Redis
  await redis.set(`${ORG_CONTEXT_PREFIX}${session.user.id}`, organizationId, { ex: ORG_CONTEXT_TTL });

  return success();
}
```

#### 2. Update `getAdditionalUserInfoClaim`

```typescript
async getAdditionalUserInfoClaim(user, scopes, client) {
  // ... get organizationIds from memberships ...

  let activeOrgId: string | null = null;

  // Check Redis for org context
  if (redis) {
    const redisOrgId = await redis.get<string>(`org_context:${user.id}`);
    if (redisOrgId && organizationIds.includes(redisOrgId)) {
      activeOrgId = redisOrgId;
      // Clean up after use (one-time use)
      await redis.del(`org_context:${user.id}`);
    }
  }

  const primaryTenantId = activeOrgId || organizationIds[0] || null;

  return { tenant_id: primaryTenantId, /* ... */ };
}
```

#### 3. Client-Side OrgSwitcher

```typescript
const handleOrgSwitch = async (orgId: string) => {
  // Step 1: Update SSO session (for UI consistency)
  await organization.setActive({ organizationId: orgId });

  // Step 2: Store in Redis for JWT generation
  await fetch(`${SSO_URL}/api/auth/set-org-context`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ organizationId: orgId }),
  });

  // Step 3: Re-authenticate to get new JWT
  await initiateLogin(orgId);
};
```

## Key Insights

1. **Better Auth MCP is useful** for understanding how the library works internally
2. **Sessions vs JWT claims** are separate concerns - session updates don't automatically update JWT claims
3. **OAuth token generation is stateless** - you need to explicitly pass context through the flow
4. **Redis is perfect for temporary context** - short TTL, no schema changes, automatic cleanup

## Security Considerations

- Validate org membership before storing in Redis
- Use short TTL (5 minutes) to prevent stale context
- Delete Redis key after use (one-time use pattern)
- Use `credentials: "include"` to send SSO session cookies

## References

- Better Auth OIDC Provider: `getAdditionalUserInfoClaim` only receives `(user, scopes, client)`
- Redis key pattern: `org_context:{userId}` with 300s TTL
- Files:
  - `apps/sso/src/app/api/auth/set-org-context/route.ts`
  - `apps/sso/src/lib/auth.ts` (getAdditionalUserInfoClaim)
  - `apps/web/src/components/OrgSwitcher.tsx`
