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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/utils/toast";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface RoleChangeDialogProps {
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
}

export function RoleChangeDialog({ open, onOpenChange, member, organizationId }: RoleChangeDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [newRole, setNewRole] = useState<"owner" | "admin" | "member">(member.role as "owner" | "admin" | "member");

  const handleSubmit = async () => {
    if (newRole === member.role) {
      toast.error("Role is unchanged");
      return;
    }

    setIsLoading(true);

    try {
      await authClient.organization.updateMemberRole({
        organizationId,
        memberId: member.id,
        role: newRole,
      });

      toast.success(`${member.userName || member.userEmail}'s role updated to ${newRole}`);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update member role");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Member Role</DialogTitle>
          <DialogDescription>
            Update the role for {member.userName || member.userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
              New Role
            </label>
            <Select value={newRole} onValueChange={(value: "owner" | "admin" | "member") => setNewRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member - Read-only access</SelectItem>
                <SelectItem value="admin">Admin - Manage members & settings</SelectItem>
                <SelectItem value="owner">Owner - Full control</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Current role: <span className="font-semibold capitalize">{member.role}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || newRole === member.role}>
            {isLoading ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
