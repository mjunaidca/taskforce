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
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/utils/toast";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface DeleteOrgSectionProps {
  organizationId: string;
  organizationName: string;
  memberCount: number;
  canDelete: boolean;
}

export function DeleteOrgSection({ organizationId, organizationName, memberCount, canDelete }: DeleteOrgSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (confirmText !== organizationName) {
      toast.error("Organization name does not match");
      return;
    }

    if (!canDelete) {
      toast.error("Cannot delete organization with multiple owners");
      return;
    }

    setIsLoading(true);

    try {
      await authClient.organization.delete({
        organizationId,
      });

      toast.success("Organization deleted successfully");
      router.push("/account/organizations");
    } catch (error) {
      console.error("Failed to delete organization:", error);
      toast.error("Failed to delete organization");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-red-200/50 p-8">
      <h2 className="text-2xl font-bold text-red-900 mb-2">Danger Zone</h2>
      <p className="text-red-700 mb-6">
        Irreversible actions that will permanently delete data
      </p>

      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Delete Organization</h3>
            <p className="text-sm text-red-700 mb-4">
              Permanently delete this organization and all associated data. This action cannot be undone.
            </p>
            {!canDelete && (
              <p className="text-sm text-red-800 font-semibold bg-red-100 rounded px-3 py-2 mb-4">
                Transfer ownership to another member before deleting
              </p>
            )}
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>{memberCount} member{memberCount !== 1 ? "s" : ""} will be removed</li>
              <li>All organization data will be deleted</li>
              <li>Active OAuth sessions will be revoked</li>
            </ul>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={!canDelete}>
                Delete Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Organization</DialogTitle>
                <DialogDescription>
                  This action is permanent and cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-semibold mb-2">Warning:</p>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    <li>All {memberCount} members will be removed</li>
                    <li>All organization data will be permanently deleted</li>
                    <li>Active OAuth sessions will be revoked immediately</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-2">
                    Type <span className="font-bold">{organizationName}</span> to confirm
                  </label>
                  <Input
                    id="confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={organizationName}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading || confirmText !== organizationName}
                >
                  {isLoading ? "Deleting..." : "Delete Organization"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
