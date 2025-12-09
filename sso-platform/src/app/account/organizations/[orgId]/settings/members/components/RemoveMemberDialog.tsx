"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    role: string;
    userId: string;
    userName: string;
    userEmail: string;
  };
  organizationId: string;
  isLastOwner: boolean;
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  organizationId,
  isLastOwner,
}: RemoveMemberDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRemove = async () => {
    if (isLastOwner) {
      toast.error("Cannot remove the last owner. Transfer ownership first.");
      return;
    }

    setIsLoading(true);

    try {
      await authClient.organization.removeMember({
        organizationId,
        memberIdOrEmail: member.userId,
      });

      toast.success(`${member.userName || member.userEmail} removed from organization`);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {member.userName || member.userEmail} from this organization?
          </DialogDescription>
        </DialogHeader>

        {isLastOwner && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              This is the last owner of the organization. You must transfer ownership before removing them.
            </p>
          </div>
        )}

        <div className="bg-muted rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-2">This action will:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Remove {member.userName || member.userEmail} from the organization</li>
            <li>Revoke their access to organization resources</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={isLoading || isLastOwner}>
            {isLoading ? "Removing..." : "Remove Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
