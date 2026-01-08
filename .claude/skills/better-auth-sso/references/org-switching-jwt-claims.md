# Organization Switching with JWT Claims

## Problem

`getAdditionalUserInfoClaim` cannot access session data because:
- Better Auth stores sessions in Redis, not PostgreSQL
- Token generation is a back-channel request (no browser context)
- Function only receives `(user, scopes, client)` - no session access

## Solution: Redis Context Store

Pass org selection through OAuth flow using Redis as temporary storage.

### Pattern

```
OrgSwitcher → setActive() → POST /api/auth/set-org-context → Redis[org_context:{userId}]
                                                                      ↓
                              OAuth flow ← initiateLogin()
                                                                      ↓
                 getAdditionalUserInfoClaim reads Redis → JWT with tenant_id
```

### SSO Endpoint

```typescript
// /api/auth/set-org-context/route.ts
const ORG_CONTEXT_PREFIX = "org_context:";
const ORG_CONTEXT_TTL = 300; // 5 minutes

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { organizationId } = await request.json();

  // Validate membership
  const memberships = await db.select().from(member).where(eq(member.userId, session.user.id));
  if (!memberships.some(m => m.organizationId === organizationId)) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  await redis.set(`${ORG_CONTEXT_PREFIX}${session.user.id}`, organizationId, { ex: ORG_CONTEXT_TTL });
  return NextResponse.json({ success: true });
}
```

### JWT Claim Generation

```typescript
async getAdditionalUserInfoClaim(user, scopes, client) {
  let activeOrgId: string | null = null;

  if (redis) {
    const redisOrgId = await redis.get<string>(`org_context:${user.id}`);
    if (redisOrgId && organizationIds.includes(redisOrgId)) {
      activeOrgId = redisOrgId;
      await redis.del(`org_context:${user.id}`); // One-time use
    }
  }

  return { tenant_id: activeOrgId || organizationIds[0] };
}
```

### Client Component

```typescript
const handleOrgSwitch = async (orgId: string) => {
  await organization.setActive({ organizationId: orgId });

  await fetch(`${SSO_URL}/api/auth/set-org-context`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ organizationId: orgId }),
  });

  await initiateLogin(orgId);
};
```

## Why This Works

- Redis is already used by Better Auth for sessions
- Short TTL (5 min) auto-cleans stale data
- One-time use pattern prevents reuse
- No database schema changes needed
- Validates org membership before storing

## Key Files

- `apps/sso/src/app/api/auth/set-org-context/route.ts`
- `apps/sso/src/lib/auth.ts` (getAdditionalUserInfoClaim)
- `apps/web/src/components/OrgSwitcher.tsx`
