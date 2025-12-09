import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organization, member, invitation, user } from "@/lib/db/schema-export";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Check admin permission
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { orgId } = await params;

  try {
    // Fetch organization details
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Fetch members with user details using proper join
    const members = await db
      .select({
        userId: member.userId,
        email: user.email,
        name: user.name,
        role: member.role,
        joinedAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, orgId));

    // Fetch pending invitations
    const invitations = await db
      .select()
      .from(invitation)
      .where(eq(invitation.organizationId, orgId));

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt.toISOString(),
      members: members.map((m: typeof members[number]) => ({
        userId: m.userId,
        email: m.email,
        name: m.name,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
      invitations: invitations.map((inv: typeof invitations[number]) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt.toISOString(),
        status: inv.status,
      })),
      metadata: org.metadata,
    });
  } catch (error) {
    console.error("Failed to fetch organization details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
