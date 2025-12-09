import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { organization, member } from "@/lib/db/schema-export";
import { sql, count, desc } from "drizzle-orm";
import { AdminOrgTable } from "./components/AdminOrgTable";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Admin permission check
  if (!session || (session.user as any).role !== "admin") {
    redirect("/account/organizations");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = params.status || "all";
  const perPage = 50;
  const offset = (page - 1) * perPage;

  // Build query with filters
  let query = db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      metadata: organization.metadata,
      createdAt: organization.createdAt,
      memberCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${member}
        WHERE ${member.organizationId} = ${organization.id}
      )`,
      ownerEmail: sql<string>`(
        SELECT u.email
        FROM ${member} m
        JOIN "user" u ON u.id = m.user_id
        WHERE m.organization_id = ${organization.id}
        AND m.role = 'owner'
        LIMIT 1
      )`,
    })
    .from(organization)
    .orderBy(desc(organization.createdAt))
    .limit(perPage)
    .offset(offset);

  // Get total count for pagination
  const [totalResult] = await db.select({ count: count() }).from(organization);
  const total = totalResult.count;
  const totalPages = Math.ceil(total / perPage);

  // Fetch organizations
  const organizations = await query;

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-taskflow-500 to-taskflow-600 rounded-full" />

            <div className="pl-6">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                Organization Management
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Platform-wide organization oversight and bulk operations
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="text-sm text-slate-600 mb-1">Total Organizations</div>
            <div className="text-3xl font-bold text-slate-900">{total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="text-sm text-slate-600 mb-1">Active</div>
            <div className="text-3xl font-bold text-green-600">{total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="text-sm text-slate-600 mb-1">Disabled</div>
            <div className="text-3xl font-bold text-red-600">0</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="text-sm text-slate-600 mb-1">This Month</div>
            <div className="text-3xl font-bold text-taskflow-600">
              {organizations.filter((org: typeof organizations[number]) => {
                const createdDate = new Date(org.createdAt);
                const now = new Date();
                return (
                  createdDate.getMonth() === now.getMonth() &&
                  createdDate.getFullYear() === now.getFullYear()
                );
              }).length}
            </div>
          </div>
        </div>

        {/* Organizations Table */}
        <AdminOrgTable
          organizations={organizations}
          currentPage={page}
          totalPages={totalPages}
          total={total}
        />
      </div>
    </div>
  );
}
