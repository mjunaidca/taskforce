"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { organization } from "@/lib/auth-client"
import { initiateLogin } from "@/lib/auth"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Building2, Check, Loader2 } from "lucide-react"

/**
 * Organization Switcher Component
 *
 * Allows users to switch between organizations they belong to.
 * Implements the enterprise pattern: Identity Session + Tenant-Scoped Tokens
 *
 * How it works:
 * 1. User clicks organization → calls organization.setActive()
 * 2. SSO updates session.activeOrganizationId in database
 * 3. Redirect to SSO login with prompt=none for silent re-auth
 * 4. SSO issues NEW JWT with updated tenant_id from session
 * 5. All subsequent requests use new JWT with new tenant_id
 *
 * Why redirect instead of refresh?
 * - The JWT (taskflow_id_token cookie) is issued at login time
 * - router.refresh() only re-renders React components, doesn't replace JWT
 * - Need full OAuth flow to get new JWT with updated tenant_id claim
 * - prompt=none enables silent re-auth (no login screen shown)
 */
export function OrgSwitcher() {
  const { user } = useAuth()
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract organization data from JWT claims
  const activeOrgId = user?.tenant_id || null
  const organizationIds = user?.organization_ids || []
  const organizationNames = user?.organization_names || []

  // Find the active organization's name
  const activeOrgIndex = organizationIds.findIndex(id => id === activeOrgId)
  const activeOrgName = activeOrgIndex >= 0
    ? organizationNames[activeOrgIndex]
    : activeOrgId || "No Organization"

  // Show switcher if user has any organization data
  if (!user || organizationIds.length === 0) {
    return null
  }

  const handleOrgSwitch = async (orgId: string) => {
    // Don't switch if already active
    if (orgId === activeOrgId) return

    setIsSwitching(true)
    setError(null)

    try {
      console.log("[OrgSwitcher] Step 1: Calling setActive for org:", orgId)

      // Step 1: Update SSO session's active organization
      const result = await organization.setActive({ organizationId: orgId })
      console.log("[OrgSwitcher] setActive result:", result)

      // Small delay to ensure session is committed to database
      // before starting OAuth flow (workaround for potential race condition)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Step 2: Re-authenticate to get new JWT with updated tenant_id
      // The SSO will read the updated activeOrganizationId from session
      // and include it as tenant_id in the new JWT
      // Using initiateLogin triggers full OAuth flow to get fresh tokens
      console.log("[OrgSwitcher] Step 2: Initiating OAuth flow for new tokens")
      await initiateLogin()

      // Note: initiateLogin sets window.location.href which triggers navigation
      // If we reach here, something went wrong (should have redirected)
      console.error("[OrgSwitcher] initiateLogin did not redirect - unexpected")
    } catch (err) {
      console.error("[OrgSwitcher] Failed to switch organization:", err)
      setError(err instanceof Error ? err.message : "Failed to switch organization")
      setIsSwitching(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isSwitching}
          >
            {isSwitching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {activeOrgName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizationIds.map((orgId, index) => {
            const displayName = organizationNames[index] || orgId.slice(0, 12) + '...'

            return (
              <DropdownMenuItem
                key={orgId}
                onClick={() => handleOrgSwitch(orgId)}
                className="flex items-center justify-between cursor-pointer"
                disabled={isSwitching}
              >
                <span className="truncate">{displayName}</span>
                {orgId === activeOrgId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <div className="text-xs text-destructive max-w-[200px] truncate">
          {error}
        </div>
      )}
    </div>
  )
}
