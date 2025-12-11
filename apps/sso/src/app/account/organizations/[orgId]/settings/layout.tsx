import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema-export";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/sign-in");
  }

  // Verify user is member of this organization
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, orgId),
      eq(member.userId, session.user.id)
    ),
  });

  if (!membership) {
    redirect("/account/organizations");
  }

  // Get organization details
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
  });

  if (!org) {
    notFound();
  }

  const isOwnerOrAdmin = ["owner", "admin"].includes(membership.role);

  const tabs = [
    {
      href: `/account/organizations/${orgId}/settings/general`,
      label: "General",
      requiresAdmin: true,
    },
    {
      href: `/account/organizations/${orgId}/settings/members`,
      label: "Members",
      requiresAdmin: false,
    },
    {
      href: `/account/organizations/${orgId}/settings/danger`,
      label: "Danger Zone",
      requiresAdmin: true,
      dangerous: true,
    },
  ];

  return (
    <div className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-taskflow-500 to-taskflow-600 rounded-full" />

            <div className="pl-6">
              <Link
                href="/account/organizations"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Organizations
              </Link>
              <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3 bg-gradient-to-r from-foreground to-foreground bg-clip-text">
                {org.name}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                Organization Settings
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-border/50 mb-6">
          <div className="flex space-x-1 p-1">
            {tabs.map((tab) => {
              // Hide tabs that require admin if user is not admin
              if (tab.requiresAdmin && !isOwnerOrAdmin) {
                return null;
              }

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-md text-center",
                    tab.dangerous
                      ? "text-red-600 hover:bg-red-50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
