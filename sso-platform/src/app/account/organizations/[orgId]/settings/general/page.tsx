import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema-export";
import { eq, and } from "drizzle-orm";
import { GeneralSettingsForm } from "./components/GeneralSettingsForm";

export default async function GeneralSettingsPage({
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

  // Verify user is owner or admin
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, orgId),
      eq(member.userId, session.user.id)
    ),
  });

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    redirect("/account/organizations");
  }

  // Get organization details
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
  });

  if (!org) {
    redirect("/account/organizations");
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">General Settings</h2>
        <p className="text-muted-foreground">
          Update your organization's basic information
        </p>
      </div>

      <GeneralSettingsForm organization={org} />
    </div>
  );
}
