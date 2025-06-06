import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  await connectMongo();
  const { tournamentCode, boardNumber } = await req.json();
  const { TournamentModel, QrTokenModel } = getModels();

  console.log(tournamentCode, boardNumber)

  if (!tournamentCode || !boardNumber) {
    return NextResponse.json({ error: "Tournament code and board number are required" }, { status: 401 });
  }

  const tournament = await TournamentModel.findOne({ code: tournamentCode });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 400 });
  }

  // Ellenőrizzük, hogy létezik-e már token ehhez a táblához
  const existingToken = await QrTokenModel.findOne({
    tournamentId: tournament._id,
    boardNumber,
  });
  if (existingToken && existingToken.expiresAt > new Date()) {
    return NextResponse.json({ token: existingToken.token });
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 3600000 * 8); // 8 óra lejárat

  await QrTokenModel.create({
    token,
    tournamentId: tournament._id,
    boardNumber,
    expiresAt,
  });

  return NextResponse.json({ token });
}