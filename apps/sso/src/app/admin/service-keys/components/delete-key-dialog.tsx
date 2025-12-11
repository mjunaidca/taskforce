"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ApiKey {
  id: string;
  name: string | null;
  start: string | null;
}

interface DeleteKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: ApiKey;
  onConfirm: () => Promise<void>;
}

export function DeleteKeyDialog({ open, onOpenChange, apiKey, onConfirm }: DeleteKeyDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyName = apiKey.name || "Unnamed Key";
  const canDelete = confirmName === keyName;

  const handleDelete = async () => {
    if (!canDelete) return;

    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err.message || "Failed to delete API key");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setError(null);
      setConfirmName("");
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete API Key</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the API key.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              <strong>Danger:</strong> Deleting this key will immediately and
              permanently prevent any services using it from authenticating.
              This cannot be recovered.
            </AlertDescription>
          </Alert>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Key to delete:</p>
            <p className="font-medium">{keyName}</p>
            {apiKey.start && (
              <p className="text-sm text-gray-500 font-mono">{apiKey.start}...</p>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="confirm-name">
              Type <strong>{keyName}</strong> to confirm:
            </Label>
            <Input
              id="confirm-name"
              placeholder="Enter key name to confirm"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              disabled={isDeleting}
            />
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
