/**
 * API endpoint to list organization members.
 *
 * Used by TaskFlow API to sync org members as workers.
 * Requires the user to be a member of the organization.
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { member, user } from "@/lib/db/schema-export";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  try {
    // Verify user is member of this organization
    const userMembership = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, orgId),
        eq(member.userId, session.user.id)
      ),
    });

    if (!userMembership) {
      return NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 }
      );
    }

    // Fetch all members with user details
    const members = await db
      .select({
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: member.role,
        joinedAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, orgId));

    return NextResponse.json({
      organizationId: orgId,
      members: members.map((m: typeof members[number]) => ({
        userId: m.userId,
        email: m.email,
        name: m.name,
        image: m.image,
        role: m.role,
        joinedAt: m.joinedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch organization members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
