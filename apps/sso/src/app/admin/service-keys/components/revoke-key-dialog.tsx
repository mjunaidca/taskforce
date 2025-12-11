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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ApiKey {
  id: string;
  name: string | null;
  start: string | null;
}

interface RevokeKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: ApiKey;
  onConfirm: () => Promise<void>;
}

export function RevokeKeyDialog({ open, onOpenChange, apiKey, onConfirm }: RevokeKeyDialogProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async () => {
    setError(null);
    setIsRevoking(true);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err.message || "Failed to revoke API key");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isRevoking) {
      setError(null);
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this API key?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-700">
              <strong>Warning:</strong> Revoking this key will immediately
              prevent any services using it from authenticating. This action
              cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Key to revoke:</p>
            <p className="font-medium">{apiKey.name || "Unnamed Key"}</p>
            {apiKey.start && (
              <p className="text-sm text-gray-500 font-mono">{apiKey.start}...</p>
            )}
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
            disabled={isRevoking}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={isRevoking}
          >
            {isRevoking ? "Revoking..." : "Revoke Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
