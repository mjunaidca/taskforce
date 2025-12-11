"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/auth/sign-in";
          },
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/auth/sign-in";
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors ${className || ""}`}
    >
      {isLoading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
