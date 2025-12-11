import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import { db } from "@/lib/db";
import { organization, member } from "@/lib/db/schema-export";
import { eq, sql } from "drizzle-orm";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { OrgBadge } from "@/components/organizations/OrgBadge";
import { formatMemberCount } from "@/lib/utils/organization";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const params = await searchParams;
  const redirectUrl = params.redirect || null;

  // Fetch active organization if any
  let activeOrg = null;
  let userRole = null;
  let memberCount = 0;

  if (session.session.activeOrganizationId) {
    const result = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        userRole: member.role,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${member}
          WHERE ${member.organizationId} = ${organization.id}
        )`,
      })
      .from(organization)
      .innerJoin(member, eq(member.organizationId, organization.id))
      .where(eq(organization.id, session.session.activeOrganizationId))
      .limit(1);

    if (result.length > 0) {
      activeOrg = {
        id: result[0].id,
        name: result[0].name,
        slug: result[0].slug,
        logo: result[0].logo,
      };
      userRole = result[0].userRole;
      memberCount = result[0].memberCount;
    }
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Refined Header Section */}
        <div className="mb-8">
          {/* Back Button - Floating Above */}
          {redirectUrl && (
            <a
              href={redirectUrl}
              className="inline-flex items-center gap-2 mb-6 group text-slate-600 hover:text-slate-900 transition-colors duration-200"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 group-hover:border-slate-300 group-hover:shadow-sm transition-all duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
              <span className="text-sm font-medium">Back</span>
            </a>
          )}

          {/* Hero Header */}
          <div className="relative">
            {/* Decorative accent */}
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-taskflow-500 to-taskflow-600 rounded-full" />

            <div className="pl-6">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                Profile Settings
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Manage your account details and personalize your experience
              </p>
            </div>
          </div>
        </div>

        {/* Active Organization Section */}
        {activeOrg && (
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-taskflow-100/20 via-transparent to-purple-100/20 rounded-2xl blur-2xl -z-10" />

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Organization</h2>
              <div className="flex items-center gap-4">
                <OrgLogo name={activeOrg.name} logo={activeOrg.logo} size="lg" />
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{activeOrg.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-slate-600">
                      {formatMemberCount(memberCount)}
                    </p>
                    <span className="text-slate-400">•</span>
                    <OrgBadge role={userRole as any} />
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/account/organizations">Manage Organizations</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Form Card with Enhanced Shadow */}
        <div className="relative">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-taskflow-100/20 via-transparent to-purple-100/20 rounded-2xl blur-2xl -z-10" />

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8 md:p-10">
            <ProfileForm user={session.user} redirectUrl={redirectUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
