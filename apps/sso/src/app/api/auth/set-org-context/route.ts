import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema-export";
import { eq } from "drizzle-orm";

// Redis key prefix for org context
const ORG_CONTEXT_PREFIX = "org_context:";
// TTL: 5 minutes (enough time for OAuth flow to complete)
const ORG_CONTEXT_TTL = 300;

/**
 * POST /api/auth/set-org-context
 *
 * Stores the user's selected organization in Redis for use during JWT generation.
 * Called before initiating OAuth re-authentication for org switching.
 *
 * This is needed because:
 * - getAdditionalUserInfoClaim can't access Redis sessions
 * - We don't want to modify the DB schema
 * - The OAuth token endpoint is a back-channel request without browser context
 *
 * Request body: { organizationId: string }
 * Security: Validates user is a member of the requested organization.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Redis is available
    if (!redis) {
      console.error("[set-org-context] Redis not configured");
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 }
      );
    }

    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId || typeof organizationId !== "string") {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    // Verify user is a member of this organization
    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, session.user.id));

    const isMember = memberships.some((m: { organizationId: string }) => m.organizationId === organizationId);

    if (!isMember) {
      return NextResponse.json(
        { error: "User is not a member of this organization" },
        { status: 403 }
      );
    }

    // Store in Redis with TTL
    const key = `${ORG_CONTEXT_PREFIX}${session.user.id}`;
    await redis.set(key, organizationId, { ex: ORG_CONTEXT_TTL });

    console.log("[set-org-context] Stored org context:", session.user.id, "->", organizationId);

    return NextResponse.json({
      success: true,
      organizationId,
      expiresIn: ORG_CONTEXT_TTL,
    });
  } catch (error) {
    console.error("[set-org-context] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
