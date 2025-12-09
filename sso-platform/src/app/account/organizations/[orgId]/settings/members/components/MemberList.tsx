"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OrgBadge } from "@/components/organizations/OrgBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleChangeDialog } from "./RoleChangeDialog";
import { RemoveMemberDialog } from "./RemoveMemberDialog";
import { formatDistanceToNow } from "date-fns";

interface MemberListProps {
  members: Array<{
    id: string;
    role: string;
    createdAt: Date;
    userId: string;
    userName: string;
    userEmail: string;
    userImage: string | null;
  }>;
  organizationId: string;
  currentUserId: string;
  currentUserRole: string;
  isOwnerOrAdmin: boolean;
}

export function MemberList({
  members,
  organizationId,
  currentUserId,
  currentUserRole,
  isOwnerOrAdmin,
}: MemberListProps) {
  const [mounted, setMounted] = useState(false);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    member: typeof members[number] | null;
  }>({ open: false, member: null });

  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean;
    member: typeof members[number] | null;
  }>({ open: false, member: null });

  useEffect(() => {
    setMounted(true);
  }, []);

  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Member</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Joined</th>
              {isOwnerOrAdmin && (
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isCurrentUser = member.userId === currentUserId;
              const canModify =
                isOwnerOrAdmin &&
                !isCurrentUser &&
                !(member.role === "owner" && currentUserRole !== "owner");

              return (
                <tr key={member.id} className="border-b border-slate-100 hover:bg-muted">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-taskflow-100 text-taskflow-700 rounded-full flex items-center justify-center font-semibold">
                        {member.userName?.[0]?.toUpperCase() || member.userEmail[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{member.userName || "No name"}</div>
                        <div className="text-sm text-muted-foreground">{member.userEmail}</div>
                      </div>
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground font-medium">(You)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <OrgBadge role={member.role as "owner" | "admin" | "member"} />
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {mounted ? formatDistanceToNow(new Date(member.createdAt), { addSuffix: true }) : "Loading..."}
                  </td>
                  {isOwnerOrAdmin && (
                    <td className="py-4 px-4 text-right">
                      {canModify ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setRoleChangeDialog({ open: true, member })}
                            >
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRemoveDialog({ open: true, member })}
                              className="text-red-600"
                            >
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      {roleChangeDialog.member && (
        <RoleChangeDialog
          open={roleChangeDialog.open}
          onOpenChange={(open) => setRoleChangeDialog({ open, member: null })}
          member={roleChangeDialog.member}
          organizationId={organizationId}
        />
      )}

      {removeDialog.member && (
        <RemoveMemberDialog
          open={removeDialog.open}
          onOpenChange={(open) => setRemoveDialog({ open, member: null })}
          member={removeDialog.member}
          organizationId={organizationId}
          isLastOwner={ownerCount === 1 && removeDialog.member.role === "owner"}
        />
      )}
    </>
  );
}
