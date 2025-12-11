"use client";

import { getOrgInitials } from "@/lib/utils/organization";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OrgLogoProps {
  name: string;
  logo?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-lg",
};

/**
 * Organization Logo Component
 * Displays organization logo with fallback to initials
 */
export function OrgLogo({ name, logo, size = "md", className = "" }: OrgLogoProps) {
  const initials = getOrgInitials(name);
  const sizeClass = sizeClasses[size];

  return (
    <Avatar className={`${sizeClass} ${className}`}>
      {logo && <AvatarImage src={logo} alt={`${name} logo`} />}
      <AvatarFallback className="bg-gradient-to-br from-taskflow-500 to-taskflow-600 text-white font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
