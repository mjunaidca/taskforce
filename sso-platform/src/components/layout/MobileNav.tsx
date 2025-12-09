"use client";

import { useState } from "react";
import { Menu, X, Building2, User, Shield, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";

interface MobileNavProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
  activeOrgName?: string | null;
}

/**
 * Mobile navigation drawer
 */
export function MobileNav({ user, activeOrgName }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "admin";

  const navItems = [
    {
      href: "/account/profile",
      label: "Profile",
      icon: User,
    },
    {
      href: "/account/organizations",
      label: "Organizations",
      icon: Building2,
    },
    ...(isAdmin
      ? [
          {
            href: "/admin/organizations",
            label: "Admin Panel",
            icon: Shield,
          },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    setIsOpen(false);
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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        {/* User Info */}
        <div className="mt-6 flex flex-col items-center gap-3 pb-6 border-b">
          <Avatar className="h-16 w-16">
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <p className="font-semibold">{user.name}</p>
              {isAdmin && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{user.email}</p>
            {activeOrgName && (
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-slate-600">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{activeOrgName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-taskflow-50 text-taskflow-700"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Sign Out */}
        <div className="pt-6">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
