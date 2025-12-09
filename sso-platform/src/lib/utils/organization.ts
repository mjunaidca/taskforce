/**
 * Organization Utility Functions
 * Helper functions for organization operations
 */

import type { OrgRole } from "@/types/organization";

/**
 * Sanitize a string to create a URL-safe slug
 * Converts to lowercase, replaces spaces/special chars with hyphens
 *
 * @param input - Raw input string
 * @returns URL-safe slug (lowercase, alphanumeric + hyphens only)
 *
 * @example
 * slugify("AI Lab") // "ai-lab"
 * slugify("Panaversity 2024!") // "panaversity-2024"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, "") // Remove special characters except hyphens and spaces
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Validate a slug format (lowercase alphanumeric + hyphens only)
 *
 * @param slug - Slug to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * validateSlug("ai-lab") // true
 * validateSlug("AI Lab") // false (uppercase)
 * validateSlug("ai_lab") // false (underscore)
 */
export function validateSlug(slug: string): boolean {
  // Must be 2-50 characters, lowercase alphanumeric + hyphens only
  return /^[a-z0-9-]{2,50}$/.test(slug);
}

/**
 * Format member count for display
 *
 * @param count - Number of members
 * @returns Formatted string (e.g., "1 member", "5 members", "1,234 members")
 */
export function formatMemberCount(count: number): string {
  const formatted = new Intl.NumberFormat("en-US").format(count);
  return `${formatted} ${count === 1 ? "member" : "members"}`;
}

/**
 * Get role display name and color
 *
 * @param role - Organization role
 * @returns Display name and Tailwind color class
 */
export function getRoleDisplay(role: OrgRole): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  switch (role) {
    case "owner":
      return { label: "Owner", variant: "default" };
    case "admin":
      return { label: "Admin", variant: "secondary" };
    case "member":
      return { label: "Member", variant: "outline" };
  }
}

/**
 * Check if user has permission to perform organization admin actions
 *
 * @param role - User's role in the organization
 * @returns true if owner or admin
 */
export function canManageOrganization(role?: OrgRole | null): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if user has permission to delete organization
 *
 * @param role - User's role in the organization
 * @returns true if owner only
 */
export function canDeleteOrganization(role?: OrgRole | null): boolean {
  return role === "owner";
}

/**
 * Generate organization initials from name (for logo fallback)
 *
 * @param name - Organization name
 * @returns Up to 2 uppercase initials
 *
 * @example
 * getOrgInitials("AI Lab") // "AL"
 * getOrgInitials("Panaversity") // "PA"
 */
export function getOrgInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * Calculate days until expiry
 *
 * @param expiresAt - Expiry date
 * @returns Days until expiry (negative if expired)
 */
export function getDaysUntilExpiry(expiresAt: Date): number {
  const now = new Date();
  const diff = new Date(expiresAt).getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if invitation is expired
 *
 * @param expiresAt - Expiry date
 * @returns true if expired
 */
export function isInvitationExpired(expiresAt: Date): boolean {
  return new Date(expiresAt) < new Date();
}
