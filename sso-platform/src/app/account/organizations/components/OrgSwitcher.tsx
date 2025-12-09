"use client";

import { useState } from "react";
import { Organization, OrgRole } from "@/types/organization";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { OrgBadge } from "@/components/organizations/OrgBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/utils/toast";

interface OrgSwitcherProps {
  organizations: Array<{
    organization: Organization;
    userRole: OrgRole;
    isActive: boolean;
  }>;
  activeOrgId?: string | null;
}

export function OrgSwitcher({ organizations, activeOrgId }: OrgSwitcherProps) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  const activeOrg = organizations.find((org) => org.isActive);

  const handleSwitch = async (orgId: string, orgName: string) => {
    if (orgId === activeOrgId) return;

    setIsSwitching(true);
    try {
      await authClient.organization.setActive({
        organizationId: orgId,
      });

      toast.success(`Switched to ${orgName}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to switch organization:", error);
      toast.error("Failed to switch organization");
    } finally {
      setIsSwitching(false);
    }
  };

  if (organizations.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[200px] justify-between"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 truncate">
            {activeOrg ? (
              <>
                <OrgLogo
                  name={activeOrg.organization.name}
                  logo={activeOrg.organization.logo}
                  size="sm"
                />
                <span className="truncate">{activeOrg.organization.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select Organization</span>
            )}
          </div>
          <svg
            className="w-4 h-4 ml-2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Your Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.organization.id}
            onClick={() => handleSwitch(org.organization.id, org.organization.name)}
            disabled={isSwitching || org.isActive}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              <OrgLogo
                name={org.organization.name}
                logo={org.organization.logo}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{org.organization.name}</div>
                <div className="text-xs text-muted-foreground">@{org.organization.slug}</div>
              </div>
              {org.isActive && (
                <svg
                  className="w-4 h-4 text-taskflow-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/account/organizations" className="cursor-pointer">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Manage Organizations
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
