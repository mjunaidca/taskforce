"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Building2, Shield } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
  activeOrgName?: string | null;
}

/**
 * User menu dropdown with profile, settings, and sign out
 */
export function UserMenu({ user, activeOrgName }: UserMenuProps) {
  const router = useRouter();
  const isAdmin = user.role === "admin";

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/sign-in");
  };

  // Generate initials from name or email
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-taskflow-500 focus:ring-offset-2">
        <Avatar className="h-8 w-8">
          {user.image && <AvatarImage src={user.image} alt={user.name} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{user.name}</span>
              {isAdmin && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                  Admin
                </span>
              )}
            </div>
            <span className="text-xs font-normal text-slate-500">
              {user.email}
            </span>
            {activeOrgName && (
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{activeOrgName}</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="/account/profile"
            className="flex items-center gap-2 cursor-pointer"
          >
            <User className="w-4 h-4" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/account/organizations"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            Organizations
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/admin/organizations"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
