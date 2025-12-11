"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { BackgroundSelect } from "./background-select";
import { HardwareTierSelect } from "./hardware-tier-select";
import { Toast } from "./toast";
import type { SoftwareBackground, HardwareTier } from "@/types/profile";

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  background?: string;
  hardwareTier?: string;
  general?: string;
}

// Generate username from name: lowercase + remove special chars + random 6-char suffix
function generateUsername(name: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);

  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const suffix = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');

  return `${cleanName}_${suffix}`;
}

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

type Step = 1 | 2;

export function SignUpForm() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showToast, setShowToast] = useState(false);

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
    confirmPassword: "",
    name: "",
    softwareBackground: "beginner" as SoftwareBackground,
    hardwareTier: "" as HardwareTier | "",
  });

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.hardwareTier) {
      newErrors.hardwareTier = "Please select your hardware tier";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setCurrentStep(2);
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const isOAuthFlow = clientId && redirectUri && responseType;
      if (isOAuthFlow) {
        localStorage.setItem("oauth_pending_params", JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          scope: scope || undefined,
          state: state || undefined,
          code_challenge: codeChallenge || undefined,
          code_challenge_method: codeChallengeMethod || undefined,
        }));
      }

      // Auto-generate username from name
      const username = generateUsername(formData.name);

      const result = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        username,
        callbackURL: isOAuthFlow ? "/auth/verify-callback" : "/",
      });

      if (result.error) {
        console.error("Signup error:", result.error);

        const errorMessage = result.error.message || "";

        if (errorMessage.includes("compromised") || errorMessage.includes("breach") || errorMessage.includes("PASSWORD_COMPROMISED")) {
          setErrors({
            password: errorMessage,
            general: errorMessage
          });
          setCurrentStep(1);
        } else if (errorMessage.includes("already exists") || errorMessage.includes("already registered")) {
          setErrors({
            email: "This email is already registered. Try signing in instead.",
            general: "An account with this email already exists. Please sign in instead."
          });
          setCurrentStep(1);
        } else if (errorMessage.includes("username") || errorMessage.includes("Username")) {
          setErrors({
            general: `Username error: ${errorMessage}. Please try again with a different name.`
          });
          setCurrentStep(1);
        } else {
          setErrors({ general: errorMessage || "Registration failed. Please try again." });
        }
        setIsLoading(false);
        return;
      }

      // Create profile with hardware/software preferences
      if (result.data?.user?.id) {
        try {
          const profileResponse = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: result.data.user.id,
              softwareBackground: formData.softwareBackground,
              hardwareTier: formData.hardwareTier,
            }),
          });

          if (!profileResponse.ok) {
            const errorData = await profileResponse.json().catch(() => ({}));
            console.error("Failed to create profile:", errorData);
          }
        } catch (err) {
          console.error("Error creating profile:", err);
        }
      }

      // Handle OAuth flow
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

      // Handle custom redirect
      if (redirectParam) {
        window.location.href = redirectParam;
        return;
      }

      // Default: Show toast and redirect to sign-in
      setUserEmail(formData.email);
      setShowToast(true);

      setTimeout(() => {
        window.location.href = `/auth/sign-in${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      }, 2000);
    } catch (error) {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message="Account created! Please check your email to verify your account."
          type="success"
          duration={2000}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Success Message (for OAuth flows or fallback) */}
      {signupSuccess && (
        <div className="animate-fade-in-up">
          <div className="bg-success/10 border-2 border-success/30 rounded-2xl p-8 mb-6 shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              Account Created Successfully!
            </h2>

            <p className="text-muted-foreground text-center mb-6">
              We&apos;ve sent a verification email to:
            </p>

            <div className="bg-card rounded-lg px-4 py-3 mb-6 border border-border">
              <p className="text-foreground font-semibold text-center break-all">
                {userEmail}
              </p>
            </div>

            <div className="bg-card rounded-lg p-4 mb-6 border border-border">
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Next Steps:
              </h3>
              <ol className="text-sm text-muted-foreground space-y-1.5 ml-6 list-decimal">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link in the email</li>
                <li>You&apos;ll be redirected back to sign in</li>
              </ol>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`/auth/resend-verification?email=${encodeURIComponent(userEmail)}`}
                className="w-full text-center py-3 px-4 bg-success text-white font-semibold rounded-xl shadow-lg hover:bg-success/90 transition-all duration-200"
              >
                Didn&apos;t receive email? Resend verification
              </a>

              <a
                href="/auth/sign-in"
                className="w-full text-center py-3 px-4 border-2 border-border text-foreground font-semibold rounded-xl hover:border-success/50 hover:bg-success/5 transition-all duration-200"
              >
                Already verified? Sign in
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Signup Form (hidden when success) */}
      {!signupSuccess && (
        <>
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                currentStep >= 1 ? "bg-primary" : "bg-muted"
              }`} />
              <div className={`mx-3 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shadow-lg ${
                currentStep >= 1
                  ? "bg-primary text-primary-foreground scale-110"
                  : "bg-muted text-muted-foreground"
              }`}>
                1
              </div>
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                currentStep >= 2 ? "bg-primary" : "bg-muted"
              }`} />
              <div className={`mx-3 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shadow-lg ${
                currentStep >= 2
                  ? "bg-primary text-primary-foreground scale-110"
                  : "bg-muted text-muted-foreground"
              }`}>
                2
              </div>
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                currentStep >= 2 ? "bg-primary" : "bg-muted"
              }`} />
            </div>
            <div className="flex justify-between text-xs font-semibold mt-2">
              <span className={`transition-colors duration-300 ${
                currentStep === 1 ? "text-primary" : "text-muted-foreground"
              }`}>
                Account
              </span>
              <span className={`transition-colors duration-300 ${
                currentStep === 2 ? "text-primary" : "text-muted-foreground"
              }`}>
                About You
              </span>
            </div>
          </div>

          <form onSubmit={currentStep === 1 ? handleStep1Next : handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="p-4 bg-destructive/10 border-l-4 border-destructive rounded-r-xl animate-fade-in">
                <p className="text-sm font-semibold text-destructive">{errors.general}</p>
              </div>
            )}

            {/* Step 1: Account Creation */}
            <div className={`transition-all duration-500 ease-in-out ${
              currentStep === 1
                ? "opacity-100 translate-x-0 pointer-events-auto"
                : "opacity-0 absolute translate-x-full pointer-events-none"
            }`}>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground mb-2">Create your account</h2>
                <p className="text-sm text-muted-foreground">Get started in seconds</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-semibold text-foreground">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="name"
                      type="text"
                      required
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 bg-input text-foreground placeholder:text-muted-foreground ${
                        errors.name
                          ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                          : focusedField === "name"
                          ? "border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
                          : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                      }`}
                      placeholder="Your full name"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-destructive animate-fade-in">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-semibold text-foreground">
                    Email address <span className="text-destructive">*</span>
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

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                    Password <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
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
                      placeholder="At least 8 characters"
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

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground">
                    Confirm Password <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      onFocus={() => setFocusedField("confirmPassword")}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full px-4 py-3 pr-12 border rounded-xl transition-all duration-200 bg-input text-foreground placeholder:text-muted-foreground ${
                        errors.confirmPassword
                          ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                          : focusedField === "confirmPassword"
                          ? "border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
                          : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                      }`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive animate-fade-in">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full relative py-3.5 px-4 mt-6 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 overflow-hidden group btn-glow"
              >
                <span className="flex items-center justify-center">
                  Continue
                  <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Step 2: Background Questions */}
            <div className={`transition-all duration-500 ease-in-out ${
              currentStep === 2
                ? "opacity-100 translate-x-0 pointer-events-auto"
                : "opacity-0 absolute translate-x-full pointer-events-none"
            }`}>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setErrors({});
                  }}
                  className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors group"
                >
                  <svg className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Tell us about yourself</h2>
                <p className="text-sm text-muted-foreground">Help us personalize your experience</p>
              </div>

              <BackgroundSelect
                value={formData.softwareBackground}
                onChange={(value) => setFormData({ ...formData, softwareBackground: value })}
                error={errors.background}
              />

              <HardwareTierSelect
                value={formData.hardwareTier}
                onChange={(value) => setFormData({ ...formData, hardwareTier: value })}
                error={errors.hardwareTier}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative py-3.5 px-4 mt-6 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group btn-glow"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <>
                    <span className="relative z-10">Create account</span>
                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </button>
            </div>

            <div className="relative pt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">Already have an account?</span>
              </div>
            </div>

            <a
              href={`/auth/sign-in${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="block w-full text-center py-3 px-4 border-2 border-border text-foreground font-semibold rounded-xl hover:border-primary/50 hover:text-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
            >
              Sign in
            </a>
          </form>
        </>
      )}
    </div>
  );
}
