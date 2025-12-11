"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import { OrgBadge } from "@/components/organizations/OrgBadge";
import { toast } from "@/lib/utils/toast";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface AcceptInvitationCardProps {
  invitation: {
    id: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: Date;
    createdAt: Date;
    organizationName: string;
    organizationLogo: string | null;
    organizationSlug: string;
    inviterName: string | null;
    inviterEmail: string;
  };
  isExpired: boolean;
  isSignedIn: boolean;
}

export function AcceptInvitationCard({ invitation, isExpired, isSignedIn }: AcceptInvitationCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);

    try {
      await authClient.organization.acceptInvitation({
        invitationId: invitation.id,
      });

      toast.success(`You've joined ${invitation.organizationName}!`);
      router.push("/account/organizations");
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      toast.error("Failed to accept invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);

    try {
      await authClient.organization.rejectInvitation({
        invitationId: invitation.id,
      });

      toast.success("Invitation declined");
      router.push("/");
    } catch (error) {
      console.error("Failed to decline invitation:", error);
      toast.error("Failed to decline invitation");
    } finally {
      setIsLoading(false);
    }
  };

  if (isExpired) {
    return (
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Invitation Expired</h2>
          <p className="text-slate-600 mb-6">
            This invitation to join <strong>{invitation.organizationName}</strong> has expired.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Invitations are valid for 48 hours. Please contact the organization owner to request a new invitation.
          </p>
          <Button variant="outline" asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8">
        <div className="text-center">
          <OrgLogo
            name={invitation.organizationName}
            logo={invitation.organizationLogo}
            size="xl"
            className="mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            You're invited to join
          </h2>
          <p className="text-xl font-semibold text-taskflow-600 mb-6">
            {invitation.organizationName}
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Role:</span>
                <OrgBadge role={invitation.role as "owner" | "admin" | "member"} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Invited by:</span>
                <span className="font-medium text-slate-900">
                  {invitation.inviterName || invitation.inviterEmail}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Expires:</span>
                <span className="font-medium text-slate-900">
                  {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            Please sign in to accept this invitation
          </p>

          <Button asChild className="w-full">
            <Link href={`/auth/sign-in?callbackUrl=/accept-invitation/${invitation.id}`}>
              Sign In to Accept
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8">
      <div className="text-center">
        <OrgLogo
          name={invitation.organizationName}
          logo={invitation.organizationLogo}
          size="xl"
          className="mx-auto mb-4"
        />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          You're invited to join
        </h2>
        <p className="text-xl font-semibold text-taskflow-600 mb-6">
          {invitation.organizationName}
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Role:</span>
              <OrgBadge role={invitation.role as "owner" | "admin" | "member"} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Invited by:</span>
              <span className="font-medium text-slate-900">
                {invitation.inviterName || invitation.inviterEmail}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Invited email:</span>
              <span className="font-medium text-slate-900">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Expires:</span>
              <span className="font-medium text-slate-900">
                {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={isLoading}
            className="flex-1"
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Accepting..." : "Accept Invitation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
