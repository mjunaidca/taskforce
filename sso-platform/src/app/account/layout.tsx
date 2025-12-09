import { Navbar } from "@/components/layout/Navbar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Main Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-border mt-auto">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_ORG_NAME || "Taskflow"}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
