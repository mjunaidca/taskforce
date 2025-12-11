import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { LogoutButton } from "@/components/logout-button";
import Image from "next/image";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Taskflow SSO";
  const appDescription = process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Secure Single Sign-On";
  const orgName = process.env.NEXT_PUBLIC_ORG_NAME || "Taskflow";
  const continueUrl = process.env.NEXT_PUBLIC_CONTINUE_URL || "http://localhost:3000";

  const firstName = session.user.name?.split(" ")[0] || session.user.email?.split("@")[0];

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden bg-background">
      {/* Atmospheric gradient */}
      <div className="absolute inset-0 ifk-atmosphere" />

      {/* Grid pattern */}
      <div className="absolute inset-0 ifk-grid-fade" />

      <div className="max-w-lg w-full relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-10 animate-fade-in-down">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Taskflow"
              width={280}
              height={70}
              className="h-16 w-auto"
              priority
            />
          </div>
          <p className="text-sm text-muted-foreground font-medium tracking-wide">
            {appDescription}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-card border border-border rounded-2xl shadow-card-elevated p-8 md:p-10 animate-scale-in">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30 mb-6">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-semibold text-success tracking-wide uppercase">
              Authenticated
            </span>
          </div>

          {/* User Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Welcome back, {firstName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {session.user.email}
            </p>
          </div>

          {/* Session Info */}
          <div className="bg-primary/5 rounded-xl p-5 mb-8 border border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg
                  className="w-5 h-5 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1 text-sm">
                  Secure Session Active
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your identity is verified and protected by {orgName}. Access your connected applications securely.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <a
              href={continueUrl}
              className="block w-full py-3.5 px-6 rounded-xl text-sm font-semibold text-primary-foreground bg-primary shadow-lg text-center transition-all duration-200 hover:bg-primary/90 hover:-translate-y-0.5 btn-glow"
            >
              Continue to Application →
            </a>

            <LogoutButton className="block w-full py-3.5 px-6 rounded-xl text-sm font-medium text-foreground bg-card border-2 border-border text-center transition-all duration-200 hover:border-primary/50 hover:text-primary hover:bg-primary/5" />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center animate-fade-in-up">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-medium text-foreground">{orgName}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
