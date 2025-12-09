"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { organization } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
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
 * 3. router.refresh() triggers Next.js to re-fetch server components
 * 4. SSO generates NEW JWT with updated tenant_id
 * 5. All subsequent requests use new JWT with new tenant_id
 *
 * Performance: ~200-500ms total (includes page refresh)
 * - API call: ~20-40ms
 * - Page refresh: ~200-500ms
 */
export function OrgSwitcher() {
  const { user } = useAuth()
  const router = useRouter()
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
      // Call Better Auth to update session's active organization
      await organization.setActive({ organizationId: orgId })

      // Refresh page to get new JWT with updated tenant_id
      // This triggers Next.js to:
      // 1. Re-run server components
      // 2. Fetch new session from SSO
      // 3. SSO reads updated session.activeOrganizationId
      // 4. SSO generates new JWT with tenant_id = new org
      // 5. Browser receives new JWT in httpOnly cookie
      router.refresh()
    } catch (err) {
      console.error("Failed to switch organization:", err)
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
