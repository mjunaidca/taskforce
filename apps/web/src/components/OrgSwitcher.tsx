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

// SSO URL for API calls
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:3001"

/**
 * Organization Switcher Component
 *
 * Allows users to switch between organizations they belong to.
 * Implements the enterprise pattern: Identity Session + Tenant-Scoped Tokens
 *
 * How it works:
 * 1. User clicks organization → calls organization.setActive() (updates SSO session)
 * 2. Calls SSO /api/auth/set-org-context to store orgId in Redis
 * 3. Redirect to SSO login for re-auth
 * 4. SSO reads orgId from Redis in getAdditionalUserInfoClaim
 * 5. SSO issues NEW JWT with updated tenant_id
 * 6. All subsequent requests use new JWT with new tenant_id
 *
 * Why Redis for org context?
 * - getAdditionalUserInfoClaim can't access Redis sessions (Better Auth limitation)
 * - No DB schema changes needed
 * - Short TTL (5 min) ensures cleanup
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

      // Step 1: Update SSO session's active organization (for SSO UI consistency)
      const result = await organization.setActive({ organizationId: orgId })
      console.log("[OrgSwitcher] setActive result:", result)

      // Step 2: Store org context in Redis for JWT generation
      console.log("[OrgSwitcher] Step 2: Storing org context in Redis")
      const contextResult = await fetch(`${SSO_URL}/api/auth/set-org-context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Send SSO session cookies
        body: JSON.stringify({ organizationId: orgId }),
      })

      if (!contextResult.ok) {
        const errorData = await contextResult.json().catch(() => ({}))
        console.error("[OrgSwitcher] Failed to store org context:", errorData)
        throw new Error(errorData.error || "Failed to store organization context")
      }

      console.log("[OrgSwitcher] Org context stored in Redis")

      // Step 3: Re-authenticate to get new JWT with updated tenant_id
      console.log("[OrgSwitcher] Step 3: Initiating OAuth flow for new tokens")
      await initiateLogin(orgId)

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
