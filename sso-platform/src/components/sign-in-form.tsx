"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, authClient } from "@/lib/auth-client";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
  needsVerification?: boolean;
}

// =============================================================================
// Social Login Provider Icons (008-social-login-providers)
// =============================================================================

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const RoboLearnIcon = () => (
  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
    R
  </div>
);

// Eye icons for password visibility toggle
const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Check for OAuth parameters or redirect param
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const responseType = searchParams.get("response_type");
  const scope = searchParams.get("scope");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");
  const redirectParam = searchParams.get("redirect");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await signIn.email({
        email: formData.email,
        password: formData.password,
        callbackURL: "/",
      });

      if (result.error) {
        console.error("[SignIn] Error:", result.error.status, result.error.message);

        if (result.error.status === 403 || result.error.message?.toLowerCase().includes("verify") || result.error.message?.toLowerCase().includes("verification") || result.error.message?.toLowerCase().includes("not verified")) {
          setErrors({
            general: "Please verify your email address before signing in. Check your inbox for the verification email.",
            needsVerification: true,
          });
        } else if (result.error.message?.toLowerCase().includes("password") || result.error.message?.toLowerCase().includes("incorrect") || result.error.message?.toLowerCase().includes("invalid password")) {
          setErrors({ general: "Invalid password. Please check your password and try again." });
        } else if (result.error.message?.toLowerCase().includes("not found") || result.error.message?.toLowerCase().includes("does not exist") || result.error.message?.toLowerCase().includes("no account")) {
          setErrors({ general: "No account found with this email. Please sign up first." });
        } else {
          const errorMsg = result.error.message || "Invalid credentials. Please check your email and password.";
          setErrors({ general: errorMsg });
        }
        setIsLoading(false);
        return;
      }

      // Check if this is part of an OAuth flow
      if (clientId && redirectUri && responseType) {
        const oauthParams = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          ...(scope && { scope }),
          ...(state && { state }),
          ...(codeChallenge && { code_challenge: codeChallenge }),
          ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
        });
        window.location.href = `/api/auth/oauth2/authorize?${oauthParams.toString()}`;
        return;
      }

      // Check if we have a redirect param
      if (redirectParam) {
        window.location.href = redirectParam;
        return;
      }

      // Stay on auth server after direct login
      window.location.href = "/";
    } catch (error) {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================================================
  // Social Sign-In Handler (008-social-login-providers)
  // Uses Better Auth's signIn.social() for built-in providers (Google, GitHub)
  // and authClient.signIn.oauth2() for generic OAuth providers (RoboLearn)
  // =============================================================================
  const handleSocialSignIn = async (provider: 'google' | 'github' | 'robolearn') => {
    setIsLoading(true);
    setErrors({});

    try {
      // Build callback URL that preserves OAuth parameters for SSO flows
      let callbackURL = "/";

      // If this is part of an OAuth flow, redirect back to authorize endpoint after social sign-in
      if (clientId && redirectUri && responseType) {
        const oauthParams = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          ...(scope && { scope }),
          ...(state && { state }),
          ...(codeChallenge && { code_challenge: codeChallenge }),
          ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
        });
        callbackURL = `/api/auth/oauth2/authorize?${oauthParams.toString()}`;
      } else if (redirectParam) {
        callbackURL = redirectParam;
      }

      // Use Better Auth's social sign-in
      // For built-in providers (google, github): signIn.social()
      // For generic OAuth (robolearn): signIn.oauth2() with providerId
      if (provider === 'robolearn') {
        // Generic OAuth provider (RoboLearn via genericOAuth plugin)
        await authClient.signIn.oauth2({
          providerId: 'robolearn',
          callbackURL,
        });
      } else {
        // Built-in social providers (Google, GitHub)
        await signIn.social({
          provider,
          callbackURL,
        });
      }
    } catch (error) {
      console.error(`[SignIn] Social sign-in error (${provider}):`, error);
      setErrors({ general: `Failed to sign in with ${provider}. Please try again.` });
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.general && (
          <div className={`p-4 rounded-xl border-l-4 animate-fade-in ${
            errors.needsVerification
              ? "bg-secondary/10 border-secondary text-secondary"
              : "bg-destructive/10 border-destructive text-destructive"
          }`}>
            <p className="text-sm font-medium">{errors.general}</p>
            {errors.needsVerification && (
              <a
                href={`/auth/resend-verification?email=${encodeURIComponent(formData.email)}${searchParams.toString() ? `&${searchParams.toString()}` : ""}`}
                className="mt-2 inline-block text-sm font-semibold text-secondary hover:text-secondary/80 underline underline-offset-2 transition-colors"
              >
                Resend verification email
              </a>
            )}
          </div>
        )}

        <div className="space-y-3">
          <label htmlFor="email" className="block text-sm font-semibold text-foreground">
            Email address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 bg-input text-foreground placeholder:text-muted-foreground ${
                errors.email
                  ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                  : focusedField === "email"
                  ? "border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
                  : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
              }`}
              placeholder="you@example.com"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive animate-fade-in">{errors.email}</p>
          )}
        </div>

        <div className="space-y-3">
          <label htmlFor="password" className="block text-sm font-semibold text-foreground">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              className={`w-full px-4 py-3 pr-12 border rounded-xl transition-all duration-200 bg-input text-foreground placeholder:text-muted-foreground ${
                errors.password
                  ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                  : focusedField === "password"
                  ? "border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
                  : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive animate-fade-in">{errors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <a
            href="/auth/forgot-password"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Forgot password?
          </a>
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
              Signing in...
            </span>
          ) : (
            <>
              <span className="relative z-10">Sign in</span>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </button>

        {/* =============================================================================
            Social Login Providers (008-social-login-providers)
            Buttons only render when NEXT_PUBLIC_*_ENABLED env vars are set to 'true'
            ============================================================================= */}
        {(process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true' ||
          process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true' ||
          process.env.NEXT_PUBLIC_ROBOLEARN_ENABLED === 'true') && (
          <div className="space-y-4 pt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid gap-3">
              {/* Google Sign-In */}
              {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true' && (
                <button
                  type="button"
                  onClick={() => handleSocialSignIn('google')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-border text-foreground font-medium rounded-xl hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>
              )}

              {/* GitHub Sign-In */}
              {process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true' && (
                <button
                  type="button"
                  onClick={() => handleSocialSignIn('github')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-border text-foreground font-medium rounded-xl hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GitHubIcon />
                  <span>Continue with GitHub</span>
                </button>
              )}

              {/* RoboLearn Sign-In */}
              {process.env.NEXT_PUBLIC_ROBOLEARN_ENABLED === 'true' && (
                <button
                  type="button"
                  onClick={() => handleSocialSignIn('robolearn')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-border text-foreground font-medium rounded-xl hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RoboLearnIcon />
                  <span>Continue with RoboLearn</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="relative pt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-muted-foreground">Don&apos;t have an account?</span>
          </div>
        </div>

        <a
          href={`/auth/sign-up${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
          className="block w-full text-center py-3 px-4 border-2 border-border text-foreground font-semibold rounded-xl hover:border-primary/50 hover:text-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
        >
          Create an account
        </a>
      </form>
    </div>
  );
}
