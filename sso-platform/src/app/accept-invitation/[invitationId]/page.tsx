import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { invitation, organization, user } from "@/lib/db/schema-export";
import { eq } from "drizzle-orm";
import { AcceptInvitationCard } from "../components/AcceptInvitationCard";

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Get invitation details
  const invite = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      organizationId: invitation.organizationId,
      inviterId: invitation.inviterId,
      organizationName: organization.name,
      organizationLogo: organization.logo,
      organizationSlug: organization.slug,
      inviterName: user.name,
      inviterEmail: user.email,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .leftJoin(user, eq(user.id, invitation.inviterId))
    .where(eq(invitation.id, invitationId))
    .limit(1);

  if (!invite || invite.length === 0) {
    notFound();
  }

  const inviteData = invite[0];

  // Check if already accepted
  if (inviteData.status === "accepted") {
    redirect("/account/organizations");
  }

  // Check if expired
  const isExpired = new Date() > new Date(inviteData.expiresAt);

  // Verify email matches if user is signed in
  if (session && session.user.email !== inviteData.email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-taskflow-50/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Mismatch</h2>
            <p className="text-slate-600 mb-6">
              This invitation was sent to <strong>{inviteData.email}</strong>, but you're signed in as{" "}
              <strong>{session.user.email}</strong>.
            </p>
            <p className="text-sm text-slate-500">
              Please sign out and sign in with the correct email to accept this invitation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-taskflow-50/30 flex items-center justify-center p-4">
      <AcceptInvitationCard
        invitation={inviteData}
        isExpired={isExpired}
        isSignedIn={!!session}
      />
    </div>
  );
}
