# Debug JWT Organization Claims

## Quick Check (Browser Console)

Open browser console and paste this:

```javascript
// Method 1: Check auth provider state
const authState = JSON.parse(localStorage.getItem('auth-state') || '{}');
console.log('User:', authState.user);
console.log('tenant_id:', authState.user?.tenant_id);
console.log('organization_ids:', authState.user?.organization_ids);

// Method 2: Decode JWT manually
const jwt = document.cookie.split('; ').find(c => c.startsWith('taskflow_id_token='))?.split('=')[1];
if (jwt) {
  const payload = JSON.parse(atob(jwt.split('.')[1]));
  console.log('JWT Payload:', payload);
  console.log('tenant_id:', payload.tenant_id);
  console.log('organization_ids:', payload.organization_ids);
}
```

## Expected JWT Structure

Your JWT should look like:

```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "tenant_id": "org-abc123",          // ← Current org
  "organization_ids": [                // ← All orgs user belongs to
    "org-abc123",
    "org-def456",
    "org-ghi789"
  ],
  "iat": 1234567890,
  "exp": 1234567999
}
```

## If organization_ids is missing or empty

This means SSO is not populating organization claims. Check:

### 1. User has organizations in SSO

Visit: `http://localhost:3001/account/organizations`

You should see at least 1 organization. If not, create one.

### 2. SSO is configured to include org claims

Check `sso-platform/src/lib/auth.ts` around line 580-616:

```typescript
async getAdditionalUserInfoClaim(user) {
  const memberships = await db
    .select()
    .from(member)
    .where(eq(member.userId, user.id));

  const organizationIds = memberships.map(m => m.organizationId);
  const primaryTenantId = organizationIds[0] || null;

  return {
    tenant_id: primaryTenantId,
    organization_ids: organizationIds,
    // ...
  };
}
```

### 3. Taskflow is requesting the right scopes

Check if OAuth flow includes organization scopes.

## Force JWT Refresh

If you just added organizations, you need a new JWT:

```bash
# Logout and login again
# Or just clear cookies and login
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
location.reload();
```

## Still not working?

1. Check SSO logs for JWT generation
2. Verify database has organization memberships
3. Check if user was auto-added to default org during signup
