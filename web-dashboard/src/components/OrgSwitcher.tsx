"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers/auth-provider";
import { organization } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check, Building2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
}

/**
 * Organization Switcher for Taskflow
 *
 * Enterprise-grade component that allows users to switch between organizations.
 * Implements the instant-switching pattern used by Slack, Notion, and GitHub.
 *
 * Security: All switching is validated server-side by Better Auth.
 * Performance: Router refresh re-fetches server components with new token.
 */
export function OrgSwitcher() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse organizations from JWT claims
  const activeOrgId = user?.tenant_id || null;
  const organizationIds = user?.organization_ids || [];

  // For demo, we'll show org IDs as names
  // In production, fetch org names from API
  const organizations: Organization[] = organizationIds.map((id) => ({
    id,
    name: `Organization ${id.slice(0, 8)}...`, // Shortened for UI
  }));

  const activeOrg = organizations.find((org) => org.id === activeOrgId);

  const handleOrgSwitch = async (orgId: string) => {
    if (orgId === activeOrgId) return; // Already active

    setIsSwitching(true);
    setError(null);

    try {
      // Call Better Auth to update session's active organization
      await organization.setActive({ organizationId: orgId });

      // Refresh page to get new JWT with updated tenant_id
      // This triggers server components to re-fetch with new org context
      router.refresh();

      // In a real app, you might want to show a toast notification here
      console.log(`[OrgSwitcher] Switched to organization: ${orgId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to switch organization";
      setError(message);
      console.error("[OrgSwitcher] Switch failed:", err);
      alert(`Error: ${message}`); // Simple error handling
    } finally {
      setIsSwitching(false);
    }
  };

  // Don't show switcher if user has no orgs
  if (organizations.length === 0) {
    return null;
  }

  // Don't show switcher if user only has one org
  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="w-4 h-4" />
        <span className="hidden md:inline">{activeOrg?.name || "Organization"}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          disabled={isSwitching}
        >
          <Building2 className="w-4 h-4" />
          <span className="hidden md:inline">
            {isSwitching ? "Switching..." : activeOrg?.name || "Select Organization"}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[250px]">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Switch Organization
        </div>
        <DropdownMenuSeparator />

        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleOrgSwitch(org.id)}
            className="flex items-center justify-between cursor-pointer"
            disabled={isSwitching}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="truncate">{org.name}</span>
            </div>
            {org.id === activeOrgId && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}

        {error && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-destructive">
              {error}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
