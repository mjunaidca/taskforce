import { redirect } from "next/navigation";

/**
 * Redirect handler for invitation acceptance URLs
 *
 * Email sends: /auth/accept-invitation?token=X
 * Actual page: /accept-invitation/[invitationId]
 *
 * This page redirects from the query param format to the path param format.
 */
export default async function AcceptInvitationRedirect({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    // No token provided, show error or redirect to home
    redirect("/");
  }

  // Redirect to the actual accept-invitation page with the token in the path
  redirect(`/accept-invitation/${token}`);
}
