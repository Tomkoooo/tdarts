import { NextRequest, NextResponse } from "next/server";
import { YearWrapService } from "@/database/services/year-wrap.service";
import { UserModel } from "@/database/models/user.model";
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
    try {
  // Verify admin access
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

        const body = await req.json();
        const { year, confirm } = body;

        if (!year || !confirm) {
            return NextResponse.json({ error: "Year and confirmation required" }, { status: 400 });
        }

        if (confirm !== `CONFIRM_WRAP_${year}`) {
            return NextResponse.json({ error: "Invalid confirmation code" }, { status: 400 });
        }

        const result = await YearWrapService.performYearlyReset(year);

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        console.error("Year Wrap Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
