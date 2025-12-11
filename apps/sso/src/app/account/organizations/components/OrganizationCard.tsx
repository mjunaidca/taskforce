"use client";

import { Organization, OrgRole } from "@/types/organization";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { OrgBadge } from "@/components/organizations/OrgBadge";
import { formatMemberCount } from "@/lib/utils/organization";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/utils/toast";
import Link from "next/link";

interface OrganizationCardProps {
  organization: Organization;
  memberCount: number;
  userRole: OrgRole;
  isActive: boolean;
}

export function OrganizationCard({
  organization,
  memberCount,
  userRole,
  isActive,
}: OrganizationCardProps) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitch = async () => {
    setIsSwitching(true);
    try {
      await authClient.organization.setActive({
        organizationId: organization.id,
      });

      toast.success(`Switched to ${organization.name}`);
      router.refresh(); // Refresh server component data
    } catch (error) {
      console.error("Failed to switch organization:", error);
      toast.error("Failed to switch organization. Please try again.");
    } finally {
      setIsSwitching(false);
    }
  };

  const canAccessSettings = userRole === "owner" || userRole === "admin";

  return (
    <div
      className={`relative group bg-card rounded-lg border transition-all duration-200 ${
        isActive
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border hover:shadow-sm hover:border-primary/50"
      }`}
    >
      {/* Active Badge */}
      {isActive && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded-md shadow-sm">
            Active
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <OrgLogo name={organization.name} logo={organization.logo} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-foreground truncate">
              {organization.name}
            </h3>
            <p className="text-sm text-muted-foreground">@{organization.slug}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between py-4 border-t border-b border-border">
          <div className="flex items-center gap-2">
            <OrgBadge role={userRole} />
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{formatMemberCount(memberCount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          {!isActive && (
            <Button
              onClick={handleSwitch}
              disabled={isSwitching}
              className="flex-1"
              variant="default"
            >
              {isSwitching ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Switching...
                </>
              ) : (
                "Switch"
              )}
            </Button>
          )}
          {canAccessSettings && (
            <Button
              asChild
              variant={isActive ? "default" : "outline"}
              className={!isActive ? "flex-1" : ""}
            >
              <Link href={`/account/organizations/${organization.id}/settings`}>
                Settings
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
