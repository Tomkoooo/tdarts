import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const { password } = await request.json();
    
    const isValid = await TournamentService.validateTournamentByPassword(code, password);
    
    if (isValid) {
      return NextResponse.json({ 
        success: true, 
        message: 'Password is valid' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Hibás jelszó' 
      }, { status: 401 });
    }
  } catch (error: any) {
    console.error('Tournament validate error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Hiba történt a validálás során' 
    }, { status: 500 });
  }
}
