import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Reset your password</h2>
        <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
