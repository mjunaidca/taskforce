"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailNotConfigured, setEmailNotConfigured] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      });

      if (result.error) {
        // Check if it's because email/reset is not configured
        if (result.error.message?.includes("sendResetPassword") ||
            result.error.message?.includes("not configured") ||
            result.error.message?.includes("isn't enabled") ||
            result.error.message?.includes("Reset password")) {
          setEmailNotConfigured(true);
        } else {
          setError(result.error.message || "Failed to send reset email");
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      // If the server doesn't have email configured, show appropriate message
      setEmailNotConfigured(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailNotConfigured) {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl border-l-4 bg-secondary/10 border-secondary">
          <h3 className="font-medium text-secondary mb-2">Email Not Configured</h3>
          <p className="text-sm text-muted-foreground">
            Password reset emails are not currently configured on this server.
            Please contact the administrator if you need to reset your password.
          </p>
        </div>
        <a
          href="/auth/sign-in"
          className="block text-center text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl border-l-4 bg-primary/10 border-primary">
          <h3 className="font-medium text-primary mb-2">Check your email</h3>
          <p className="text-sm text-muted-foreground">
            If an account exists for <strong className="text-foreground">{email}</strong>, we've sent a password reset link.
            Please check your inbox and spam folder.
          </p>
        </div>
        <a
          href="/auth/sign-in"
          className="block text-center text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 rounded-xl border-l-4 bg-destructive/10 border-destructive animate-fade-in">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <label htmlFor="email" className="block text-sm font-semibold text-foreground">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
          className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 bg-input text-foreground placeholder:text-muted-foreground ${
            error
              ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
              : focusedField === "email"
              ? "border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
              : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
          }`}
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full relative py-3.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group btn-glow"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Sending...
          </span>
        ) : (
          <>
            <span className="relative z-10">Send reset link</span>
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        )}
      </button>

      <a
        href="/auth/sign-in"
        className="block text-center text-sm text-primary hover:text-primary/80 font-medium transition-colors"
      >
        Back to sign in
      </a>
    </form>
  );
}
