"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Terminal, CheckCircle2, XCircle } from "lucide-react";

interface DeviceInfo {
  clientId: string;
  scope?: string;
  expiresAt?: string;
}

function DeviceAuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get user_code from URL if provided
  const initialCode = searchParams.get("user_code") || "";
  
  const [userCode, setUserCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [approved, setApproved] = useState(false);
  const [denied, setDenied] = useState(false);

  // Format user code as user types (XXXX-XXXX format)
  const formatCode = (value: string) => {
    // Remove non-alphanumeric and uppercase
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    // Insert dash after 4 characters
    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
    }
    return cleaned;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setUserCode(formatted);
    setError(null);
  };

  // Verify the user code
  const verifyCode = async () => {
    if (!userCode || userCode.replace("-", "").length < 8) {
      setError("Please enter a valid 8-character code");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      // Format code: remove dash for API
      const formattedCode = userCode.replace("-", "").toUpperCase();
      
      // Verify via Better Auth device endpoint
      const response = await fetch(
        `/api/auth/device?user_code=${formattedCode}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Invalid or expired code");
      }

      const data = await response.json();
      
      setDeviceInfo({
        clientId: data.clientId || "Unknown Client",
        scope: data.scope,
        expiresAt: data.expiresAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setVerifying(false);
    }
  };

  // Approve the device
  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      const formattedCode = userCode.replace("-", "").toUpperCase();
      
      const response = await fetch("/api/auth/device/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userCode: formattedCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve device");
      }

      setApproved(true);
      
      // Redirect to success page after short delay
      setTimeout(() => {
        router.push("/auth/device/success");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve device");
    } finally {
      setLoading(false);
    }
  };

  // Deny the device
  const handleDeny = async () => {
    setLoading(true);
    setError(null);

    try {
      const formattedCode = userCode.replace("-", "").toUpperCase();
      
      const response = await fetch("/api/auth/device/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userCode: formattedCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to deny device");
      }

      setDenied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny device");
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if code is in URL
  useEffect(() => {
    if (initialCode && initialCode.replace("-", "").length >= 8) {
      verifyCode();
    }
  }, []);

  // Client name mapping
  const getClientName = (clientId: string) => {
    const names: Record<string, string> = {
      "claude-code-client": "Claude Code",
      "cursor-client": "Cursor IDE",
      "mcp-inspector": "MCP Inspector",
      "windsurf-client": "Windsurf IDE",
    };
    return names[clientId] || clientId;
  };

  // Show approved state
  if (approved) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <CardTitle className="text-green-700 dark:text-green-400">Device Authorized!</CardTitle>
            <CardDescription>
              You can now close this window and return to your CLI tool.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show denied state
  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-red-50 to-rose-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <CardTitle className="text-red-700 dark:text-red-400">Access Denied</CardTitle>
            <CardDescription>
              The device authorization request was denied.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Terminal className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Device Authorization</CardTitle>
          <CardDescription>
            {deviceInfo 
              ? `Authorize ${getClientName(deviceInfo.clientId)} to access your TaskFlow account`
              : "Enter the code shown on your CLI tool"
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!deviceInfo ? (
            // Step 1: Enter and verify code
            <>
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Device Code
                </label>
                <Input
                  id="code"
                  placeholder="XXXX-XXXX"
                  value={userCode}
                  onChange={handleCodeChange}
                  maxLength={9}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoComplete="off"
                  disabled={verifying}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter the 8-character code displayed on your device
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={verifyCode}
                disabled={verifying || userCode.replace("-", "").length < 8}
                className="w-full"
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </>
          ) : (
            // Step 2: Approve or deny
            <>
              <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Terminal className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{getClientName(deviceInfo.clientId)}</p>
                    <p className="text-sm text-muted-foreground">
                      wants to access your account
                    </p>
                  </div>
                </div>

                {deviceInfo.scope && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Requested permissions:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {deviceInfo.scope.split(" ").map((scope) => (
                        <span
                          key={scope}
                          className="text-xs bg-background px-2 py-1 rounded border"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleDeny}
                  disabled={loading}
                  className="flex-1"
                >
                  Deny
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authorizing...
                    </>
                  ) : (
                    "Authorize"
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Only authorize devices you trust. This will allow the application
                to access TaskFlow on your behalf.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback for Suspense
function DeviceAuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
          <CardTitle>Device Authorization</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// Default export wrapped in Suspense (required for useSearchParams in Next.js 15)
export default function DeviceAuthPage() {
  return (
    <Suspense fallback={<DeviceAuthLoading />}>
      <DeviceAuthContent />
    </Suspense>
  );
}

