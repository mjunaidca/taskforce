"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Workspace Layout
 *
 * Minimal layout for the full-page Agent Workspace.
 * - Auth provider for authentication
 * - No sidebar (workspace has its own sidebar)
 * - No floating ChatKit widget (workspace IS the chat interface)
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </AuthProvider>
  );
}
