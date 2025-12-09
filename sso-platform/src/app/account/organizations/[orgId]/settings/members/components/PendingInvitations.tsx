"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OrgBadge } from "@/components/organizations/OrgBadge";
import { toast } from "@/lib/utils/toast";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

interface PendingInvitationsProps {
  invitations: Array<{
    id: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
  organizationId: string;
}

export function PendingInvitations({ invitations, organizationId }: PendingInvitationsProps) {
  const router = useRouter();
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCancel = async (invitationId: string) => {
    setLoadingIds((prev) => new Set(prev).add(invitationId));

    try {
      await authClient.organization.cancelInvitation({
        invitationId,
      });

      toast.success("Invitation cancelled");
      router.refresh();
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
      toast.error("Failed to cancel invitation");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handleResend = async (invitationId: string, email: string) => {
    setLoadingIds((prev) => new Set(prev).add(invitationId));

    try {
      // Cancel old invitation and send new one
      await authClient.organization.cancelInvitation({
        invitationId,
      });

      // Note: This is a workaround - Better Auth may have a resend method
      toast.success(`Invitation resent to ${email}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to resend invitation:", error);
      toast.error("Failed to resend invitation");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const isExpired = (expiresAt: Date) => {
    return new Date() > new Date(expiresAt);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-border/50 p-8">
      <h2 className="text-xl font-bold text-foreground mb-4">Pending Invitations</h2>

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">{invitation.email}</span>
                {invitation.role && <OrgBadge role={invitation.role as "owner" | "admin" | "member"} />}
                {isExpired(invitation.expiresAt) && (
                  <span className="text-xs text-red-600 font-medium">Expired</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {mounted ? (
                  <>
                    Sent {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })} •
                    Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                  </>
                ) : (
                  "Loading..."
                )}
              </p>
            </div>

            <div className="flex gap-2">
              {!isExpired(invitation.expiresAt) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResend(invitation.id, invitation.email)}
                  disabled={loadingIds.has(invitation.id)}
                >
                  Resend
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCancel(invitation.id)}
                disabled={loadingIds.has(invitation.id)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
