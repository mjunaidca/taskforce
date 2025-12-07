import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background">
      {/* Atmospheric gradient */}
      <div className="absolute inset-0 ifk-atmosphere" />

      {/* Grid pattern */}
      <div className="absolute inset-0 ifk-grid-fade" />

      <div className="max-w-md lg:max-w-lg w-full relative z-10">
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
            {process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Secure Single Sign-On"}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </div>

        {/* Form container */}
        <div className="bg-card border border-border rounded-2xl shadow-card-elevated p-8 md:p-10 animate-scale-in">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center animate-fade-in-up">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_ORG_NAME || "Taskflow"}
          </p>
        </div>
      </div>
    </div>
  );
}
