import { NextResponse } from "next/server";
import { AuthService } from "@/database/services/auth.service";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const user = await AuthService.verifyToken(token);

    if (user && !user.isDeleted) {
      return NextResponse.json({ user });
    } else {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  } catch (error: any) {
    console.error("Token verification error:", error.message);
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    );
  }
}