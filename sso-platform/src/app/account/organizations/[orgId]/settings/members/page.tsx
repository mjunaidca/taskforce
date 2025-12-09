import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { member, organization, user, invitation } from "@/lib/db/schema-export";
import { eq, and, desc } from "drizzle-orm";
import { MemberList } from "./components/MemberList";
import { InviteMemberDialog } from "./components/InviteMemberDialog";
import { PendingInvitations } from "./components/PendingInvitations";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/sign-in");
  }

  // Verify user is member
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, orgId),
      eq(member.userId, session.user.id)
    ),
  });

  if (!membership) {
    redirect("/account/organizations");
  }

  const isOwnerOrAdmin = ["owner", "admin"].includes(membership.role);

  // Get organization details
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
  });

  if (!org) {
    redirect("/account/organizations");
  }

  // Get all members with user details
  const members = await db
    .select({
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, orgId))
    .orderBy(member.createdAt);

  // Get pending invitations (only for owners/admins)
  const pendingInvitations = isOwnerOrAdmin
    ? await db
        .select()
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, orgId),
            eq(invitation.status, "pending")
          )
        )
        .orderBy(desc(invitation.createdAt))
    : [];

  return (
    <div className="space-y-6">
      {/* Pending Invitations (Owner/Admin only) */}
      {isOwnerOrAdmin && pendingInvitations.length > 0 && (
        <PendingInvitations
          invitations={pendingInvitations}
          organizationId={orgId}
        />
      )}

      {/* Members List */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Members</h2>
            <p className="text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""} in this organization
            </p>
          </div>

          {isOwnerOrAdmin && (
            <InviteMemberDialog organizationId={orgId} organizationName={org.name} />
          )}
        </div>

        <MemberList
          members={members}
          organizationId={orgId}
          currentUserId={session.user.id}
          currentUserRole={membership.role}
          isOwnerOrAdmin={isOwnerOrAdmin}
        />
      </div>
    </div>
  );
}
