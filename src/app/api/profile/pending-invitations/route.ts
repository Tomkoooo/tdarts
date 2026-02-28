import { NextRequest, NextResponse } from "next/server";
import { withApiTelemetry } from '@/lib/api-telemetry';

import { AuthService } from "@/database/services/auth.service";
import { TeamInvitationService } from "@/database/services/teaminvitation.service";

async function __GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const invitations = await TeamInvitationService.getPendingInvitationsForUser(
      user._id.toString(),
      user.email
    );

    const data = invitations.map((invitation: any) => ({
      _id: invitation._id.toString(),
      token: invitation.token,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      tournament: {
        tournamentId: invitation.tournamentId?.tournamentId || "",
        name:
          invitation.tournamentId?.tournamentSettings?.name ||
          invitation.tournamentId?.name ||
          "Unknown tournament",
      },
      team: {
        _id: invitation.teamId?._id?.toString?.() || "",
        name: invitation.teamId?.name || "Unknown team",
      },
      inviter: {
        _id: invitation.inviterId?._id?.toString?.() || "",
        name: invitation.inviterId?.name || "Unknown user",
        email: invitation.inviterId?.email || "",
      },
      invitee: {
        _id: invitation.inviteeId?._id?.toString?.() || "",
        name: invitation.inviteeId?.name || "",
        email: invitation.inviteeEmail || invitation.inviteeId?.email || "",
      },
      inviteType: invitation.inviteeId ? "account" : "email",
    }));

    return NextResponse.json({
      success: true,
      data: {
        invitations: data,
        count: data.length,
      },
    });
  } catch (error: any) {
    console.error("Pending invitations error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load pending invitations" },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/profile/pending-invitations', __GET as any);
