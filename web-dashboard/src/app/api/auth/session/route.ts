import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";

export async function GET() {
  const cookieStore = await cookies();

  // id_token is the JWT we use for authentication
  const idToken = cookieStore.get("taskflow_id_token")?.value;
  const expiresAt = cookieStore.get("taskflow_expires_at")?.value;

  // No id_token - not authenticated
  if (!idToken || !expiresAt) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  // Check if token is expired
  const expiresAtNum = parseInt(expiresAt, 10);
  if (Date.now() > expiresAtNum - 60000) {
    // Token expired or will expire in 1 minute
    return NextResponse.json({ authenticated: false, user: null });
  }

  // Decode user info from ID token
  try {
    const claims = decodeJwt(idToken);
    return NextResponse.json({
      authenticated: true,
      user: {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
        picture: claims.picture,
        given_name: claims.given_name,
        family_name: claims.family_name,
        preferred_username: claims.preferred_username,
        role: claims.role,
        tenant_id: claims.tenant_id,
        organization_ids: claims.organization_ids as string[] | undefined,
        organization_names: claims.organization_names as string[] | undefined,
      },
      expiresAt: expiresAtNum,
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
