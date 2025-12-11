import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { NavLink } from "./NavLink";
import { OrgSwitcherDropdown } from "./OrgSwitcherDropdown";
import { UserMenu } from "./UserMenu";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema-export";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield } from "lucide-react";

/**
 * Main navigation bar with organization context and user menu
 * Server component that fetches session and organization data
 */
export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If no session, show minimal navbar
  if (!session) {
    return (
      <nav className="border-b bg-card border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo.png"
                alt="Taskflow SSO"
                width={240}
                height={60}
                className="h-14 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/sign-in"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Fetch user's organizations
  const userOrgs = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      userRole: member.role,
    })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(eq(member.userId, session.user.id));

  // Get active organization
  const activeOrgId = session.session.activeOrganizationId;
  const activeOrg = userOrgs.find((org: typeof userOrgs[number]) => org.id === activeOrgId) || null;
  const activeOrgRole = activeOrg?.userRole || null;

  const isAdmin = session.user.role === "admin";

  return (
    <nav className="border-b bg-card border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left: Logo + Main Nav */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo.png"
                alt="Taskflow SSO"
                width={240}
                height={60}
                className="h-14 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/account/organizations">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  Organizations
                  {userOrgs.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                      {userOrgs.length}
                    </Badge>
                  )}
                </div>
              </NavLink>
              <NavLink href="/account/profile">Profile</NavLink>
              {isAdmin && (
                <NavLink href="/admin/organizations">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    Admin
                  </div>
                </NavLink>
              )}
            </div>
          </div>

          {/* Right: Theme Toggle + Active Org + User Menu + Mobile Button */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Organization Switcher */}
            <div className="hidden md:block">
              <OrgSwitcherDropdown
                activeOrg={
                  activeOrg
                    ? {
                        id: activeOrg.id,
                        name: activeOrg.name,
                        slug: activeOrg.slug,
                        logo: activeOrg.logo,
                      }
                    : null
                }
                organizations={userOrgs.map((org: typeof userOrgs[number]) => ({
                  id: org.id,
                  name: org.name,
                  slug: org.slug,
                  logo: org.logo,
                }))}
                userRole={activeOrgRole}
              />
            </div>

            {/* User Menu */}
            <div className="hidden md:block">
              <UserMenu
                user={{
                  name: session.user.name,
                  email: session.user.email,
                  image: session.user.image,
                  role: session.user.role,
                }}
                activeOrgName={activeOrg?.name}
              />
            </div>

            {/* Mobile Menu Button */}
            <MobileNav
              user={{
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
                role: session.user.role,
              }}
              activeOrgName={activeOrg?.name}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
