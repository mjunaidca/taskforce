"use client";

import { Badge } from "@/components/ui/badge";
import { getRoleDisplay } from "@/lib/utils/organization";
import type { OrgRole } from "@/types/organization";

interface OrgBadgeProps {
  role: OrgRole;
  isActive?: boolean;
}

/**
 * Organization Role Badge Component
 * Displays user's role in an organization with appropriate styling
 */
export function OrgBadge({ role, isActive = false }: OrgBadgeProps) {
  const { label, variant } = getRoleDisplay(role);

  if (isActive) {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        Active • {label}
      </Badge>
    );
  }

  return <Badge variant={variant}>{label}</Badge>;
}
