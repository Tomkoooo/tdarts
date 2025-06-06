import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";

export async function POST(req: NextRequest) {
  await connectMongo();
  const { token } = await req.json();
  const { QrTokenModel} = getModels();

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const qrToken = await QrTokenModel.findOne({ token }).populate("tournamentId");
  if (!qrToken || qrToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const tournament = qrToken.tournamentId as any; // Type assertion, mert populate után lehet, hogy nem pontosan ITournament
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return NextResponse.json({ password: tournament.tournamentPassword }, { status: 200 });
}