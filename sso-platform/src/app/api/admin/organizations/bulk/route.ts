import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organization, member } from "@/lib/db/schema-export";
import { inArray } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Check admin permission
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, organizationIds } = body;

    if (!action || !Array.isArray(organizationIds) || organizationIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: action and organizationIds required" },
        { status: 400 }
      );
    }

    // Audit log entry (for future implementation)
    const auditEntry = {
      adminId: session.user.id,
      adminEmail: session.user.email,
      action,
      organizationIds,
      timestamp: new Date().toISOString(),
    };
    console.log("Admin bulk action:", auditEntry);

    switch (action) {
      case "disable":
        // Update organization metadata to mark as disabled
        await db
          .update(organization)
          .set({
            metadata: { disabled: true, disabledAt: new Date().toISOString() },
          })
          .where(inArray(organization.id, organizationIds));

        return NextResponse.json({
          success: true,
          message: `${organizationIds.length} organizations disabled`,
        });

      case "enable":
        // Update organization metadata to mark as enabled
        await db
          .update(organization)
          .set({
            metadata: { disabled: false },
          })
          .where(inArray(organization.id, organizationIds));

        return NextResponse.json({
          success: true,
          message: `${organizationIds.length} organizations enabled`,
        });

      case "delete":
        // Delete all members first
        await db
          .delete(member)
          .where(inArray(member.organizationId, organizationIds));

        // Delete organizations
        await db
          .delete(organization)
          .where(inArray(organization.id, organizationIds));

        return NextResponse.json({
          success: true,
          message: `${organizationIds.length} organizations deleted`,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Bulk operation failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
