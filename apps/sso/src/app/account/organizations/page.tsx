import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OrganizationCard } from "./components/OrganizationCard";
import { CreateOrgDialog } from "./components/CreateOrgDialog";
import { db } from "@/lib/db";
import { member, organization } from "../../../lib/db/schema-export";
import { eq, sql } from "drizzle-orm";

export default async function OrganizationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/sign-in");
  }

  // Fetch all organizations the user belongs to with member count
  const userOrgs = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      metadata: organization.metadata,
      createdAt: organization.createdAt,
      userRole: member.role,
      memberCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${member}
        WHERE ${member.organizationId} = ${organization.id}
      )`,
    })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(eq(member.userId, session.user.id));

  // Get active organization ID from session
  const activeOrgId = session.session.activeOrganizationId;

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="relative">
            {/* Decorative accent */}
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-taskflow-500 to-taskflow-600 rounded-full" />

            <div className="pl-6 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3 bg-gradient-to-r from-foreground to-foreground bg-clip-text">
                  Organizations
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
                  Manage your organizations and switch between them
                </p>
              </div>

              <CreateOrgDialog />
            </div>
          </div>
        </div>

        {/* Organizations Grid */}
        {userOrgs.length === 0 ? (
          <div className="bg-card border border-border rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No Organizations Yet
              </h2>
              <p className="text-muted-foreground mb-6">
                Create your first organization to get started collaborating with your team.
              </p>
              <CreateOrgDialog />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userOrgs.map((org: typeof userOrgs[number]) => (
              <OrganizationCard
                key={org.id}
                organization={{
                  id: org.id,
                  name: org.name,
                  slug: org.slug,
                  logo: org.logo,
                  metadata: org.metadata,
                  createdAt: org.createdAt,
                }}
                memberCount={org.memberCount}
                userRole={org.userRole as "owner" | "admin" | "member"}
                isActive={org.id === activeOrgId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
