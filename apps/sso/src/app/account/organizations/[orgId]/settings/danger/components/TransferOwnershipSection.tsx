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
  DialogTrigger,
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

interface TransferOwnershipSectionProps {
  organizationId: string;
  organizationName: string;
  members: Array<{
    id: string;
    role: string;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  currentUserId: string;
}

export function TransferOwnershipSection({
  organizationId,
  organizationName,
  members,
  currentUserId,
}: TransferOwnershipSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const handleTransfer = async () => {
    if (!selectedMemberId) {
      toast.error("Please select a member");
      return;
    }

    setIsLoading(true);

    try {
      // Update selected member to owner
      const selectedMember = members.find((m) => m.id === selectedMemberId);
      if (!selectedMember) {
        toast.error("Member not found");
        return;
      }

      await authClient.organization.updateMemberRole({
        organizationId,
        memberId: selectedMemberId,
        role: "owner",
      });

      toast.success("Ownership transferred successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to transfer ownership:", error);
      toast.error("Failed to transfer ownership");
    } finally {
      setIsLoading(false);
    }
  };

  if (members.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-border/50 p-8">
      <h2 className="text-2xl font-bold text-foreground mb-2">Transfer Ownership</h2>
      <p className="text-muted-foreground mb-6">
        Transfer ownership of this organization to another member
      </p>

      <div className="bg-muted border border-border rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Transfer to Another Member</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The new owner will have full control over the organization. You will become an admin.
            </p>
            <p className="text-sm text-muted-foreground">
              Current members: {members.length + 1}
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Transfer Ownership</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Ownership</DialogTitle>
                <DialogDescription>
                  Select a member to transfer ownership of {organizationName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label htmlFor="member" className="block text-sm font-medium text-slate-700 mb-2">
                    New Owner
                  </label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.user.name || member.user.email} ({member.user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">This will:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Grant the selected member full ownership</li>
                    <li>Change your role to admin</li>
                    <li>Allow the new owner to delete the organization</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={handleTransfer} disabled={isLoading || !selectedMemberId}>
                  {isLoading ? "Transferring..." : "Transfer Ownership"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
