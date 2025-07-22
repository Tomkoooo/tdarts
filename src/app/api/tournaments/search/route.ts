import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { Tournament } from "@/types/tournamentSchema";

export async function GET(request: Request) {
  try {
    await connectMongo();
    const { TournamentModel, ClubModel } = getModels();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim();
    const club = searchParams.get("club")?.trim();
    const date = searchParams.get("date")?.trim();

    // Build query
    const query: any = {};

    if (name) {
      query.name = { $regex: name, $options: "i" }; // Case-insensitive search
    }

    if (club) {
      // Find clubs matching the club name
      const clubs = await ClubModel.find({
        name: { $regex: club, $options: "i" },
      }).select("_id");
      const clubIds = clubs.map((c) => c._id);
      if (clubIds.length > 0) {
        query.clubId = { $in: clubIds };
      } else {
        // If no clubs match, return empty result
        return NextResponse.json({ tournaments: [] });
      }
    }

    if (date) {
      // Expect date in YYYY-MM-DD format
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      query.startDate = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const tournaments = await TournamentModel.find(query)
      .populate("clubId", "name")
      .sort({ createdAt: -1 })
      .lean<Tournament[]>();

    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error("Hiba a tornák lekérésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a tornák lekérése" }, { status: 500 });
  }
}