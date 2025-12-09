import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema-export";
import { eq, and } from "drizzle-orm";
import { DeleteOrgSection } from "./components/DeleteOrgSection";
import { TransferOwnershipSection } from "./components/TransferOwnershipSection";

export default async function DangerZonePage({
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

  // Verify user is owner
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, orgId),
      eq(member.userId, session.user.id)
    ),
  });

  if (!membership || membership.role !== "owner") {
    redirect("/account/organizations");
  }

  // Get organization details
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
  });

  if (!org) {
    redirect("/account/organizations");
  }

  // Get all members for transfer ownership
  const members = await db.query.member.findMany({
    where: eq(member.organizationId, orgId),
    with: {
      user: true,
    },
  });

  // Count owners
  const ownerCount = members.filter((m: typeof members[number]) => m.role === "owner").length;

  return (
    <div className="space-y-6">
      {/* Transfer Ownership */}
      <TransferOwnershipSection
        organizationId={orgId}
        organizationName={org.name}
        members={members.filter((m: typeof members[number]) => m.userId !== session.user.id)}
        currentUserId={session.user.id}
      />

      {/* Delete Organization */}
      <DeleteOrgSection
        organizationId={orgId}
        organizationName={org.name}
        memberCount={members.length}
        canDelete={ownerCount === 1}
      />
    </div>
  );
}
