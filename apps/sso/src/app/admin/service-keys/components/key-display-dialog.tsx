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
import { Copy, Check, AlertTriangle } from "lucide-react";

interface KeyDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
}

export function KeyDisplayDialog({ open, onOpenChange, apiKey }: KeyDisplayDialogProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleClose = () => {
    if (!confirmed) {
      return; // Don't allow closing without confirmation
    }
    setConfirmed(false);
    setCopied(false);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !confirmed) {
      return; // Don't allow closing without confirmation
    }
    if (!newOpen) {
      setConfirmed(false);
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
          <DialogDescription>
            Your new API key has been created successfully.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-700">
              <strong>Important:</strong> This key will only be shown once.
              Please copy it now and store it securely.
            </AlertDescription>
          </Alert>

          <div className="relative">
            <div className="p-4 bg-gray-900 rounded-lg font-mono text-sm text-green-400 break-all">
              {apiKey}
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Use this key in the <code className="bg-gray-100 px-1 rounded">x-api-key</code> header
            to authenticate API requests.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-gray-300"
            />
            I have saved this key securely
          </label>
          <Button onClick={handleClose} disabled={!confirmed}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
