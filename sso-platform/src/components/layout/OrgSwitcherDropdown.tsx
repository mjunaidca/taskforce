"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, Settings, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getOrgInitials } from "@/lib/utils/organization";
import { organization } from "@/lib/auth-client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

interface OrgSwitcherDropdownProps {
  activeOrg: Organization | null;
  organizations: Organization[];
  userRole?: string | null;
}

/**
 * Organization switcher dropdown with search and quick actions
 */
export function OrgSwitcherDropdown({
  activeOrg,
  organizations,
  userRole,
}: OrgSwitcherDropdownProps) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOrgSwitch = async (orgId: string) => {
    try {
      await organization.setActive({ organizationId: orgId });
      router.refresh();
    } catch (error) {
      console.error("Failed to switch organization:", error);
    }
  };

  if (!activeOrg) {
    return (
      <Link
        href="/account/organizations"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
      >
        <Building2 className="w-4 h-4" />
        <span className="hidden md:inline">Organizations</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
        <Avatar className="h-6 w-6">
          {activeOrg.logo && (
            <AvatarImage src={activeOrg.logo} alt={activeOrg.name} />
          )}
          <AvatarFallback className="text-xs">
            {getOrgInitials(activeOrg.name)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col items-start">
          <div className="text-sm font-medium text-slate-900">
            {activeOrg.name}
          </div>
          {userRole && (
            <div className="text-xs text-slate-500 capitalize">{userRole}</div>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-slate-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[280px]">
        {/* Search */}
        <div className="p-2">
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>

        <DropdownMenuSeparator />

        {/* Organization List */}
        <div className="max-h-[300px] overflow-y-auto">
          {filteredOrgs.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-slate-500">
              No organizations found
            </div>
          ) : (
            filteredOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleOrgSwitch(org.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Avatar className="h-6 w-6">
                  {org.logo && <AvatarImage src={org.logo} alt={org.name} />}
                  <AvatarFallback className="text-xs">
                    {getOrgInitials(org.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{org.name}</span>
                {org.id === activeOrg.id && (
                  <Check className="w-4 h-4 text-taskflow-600" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem asChild>
          <Link
            href="/account/organizations"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Manage Organizations
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/account/organizations?create=true"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Organization
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
