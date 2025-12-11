"use client";

import { CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DeviceSuccessPage() {
  const handleClose = () => {
    // Try to close the window (only works if opened by script)
    window.close();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-700 dark:text-green-400">
            Authorization Successful!
          </CardTitle>
          <CardDescription className="text-base">
            Your device has been authorized to access TaskFlow.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-sm">
            <p className="text-green-800 dark:text-green-200">
              You can now return to your CLI tool. The authentication 
              should complete automatically within a few seconds.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Close This Window
            </Button>
            <p className="text-xs text-muted-foreground">
              If this window doesn&apos;t close automatically, you can safely close it manually.
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-2">What happens next?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>✓ Your CLI tool will receive an access token</li>
              <li>✓ You can start using TaskFlow commands</li>
              <li>✓ The token will be securely stored locally</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

