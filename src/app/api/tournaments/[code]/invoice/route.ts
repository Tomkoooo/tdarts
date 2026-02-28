import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { SzamlazzService } from '@/lib/szamlazz';
import { connectMongo } from '@/lib/mongoose';
import { AuthorizationService } from '@/database/services/authorization.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    await connectMongo();

    // 1. Auth Check - User must be logged in
    const userId = await AuthorizationService.getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Tournament
    const tournament = await TournamentService.getTournament(code)
    if (!tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // 3. Authorization - User must be Admin/Moderator of the club
    const isAuthorized = await AuthorizationService.checkAdminOrModerator(userId, tournament.clubId.toString());
    if (!isAuthorized) {
        // Also allow if global admin? For now restricted to club owners.
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Check for Invoice ID
    if (!tournament.invoiceId) {
        return NextResponse.json({ error: 'Invoice not found for this tournament' }, { status: 404 });
    }

    // 5. Fetch PDF from Szamlazz.hu
    try {
        const pdfBuffer = await SzamlazzService.getInvoicePdf(tournament.invoiceId);
        
        if (!pdfBuffer) {
            return NextResponse.json({ error: 'Failed to retrieve PDF content' }, { status: 500 });
        }

        // 6. Return PDF Stream
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="invoice_${tournament.invoiceId}.pdf"`);

        const binaryData = new Uint8Array(pdfBuffer);
        
        console.log(`[API Invoice] Final buffer size: ${binaryData.length} bytes`);
        console.log(`[API Invoice] Final buffer type: ${Object.prototype.toString.call(binaryData)}`);
        const hex = Buffer.from(binaryData).slice(0, 16).toString('hex');
        console.log(`[API Invoice] Final Hex Header: ${hex}`);

        headers.set('Content-Length', binaryData.length.toString());

        return new Response(binaryData, {
            status: 200,
            headers,
        });

    } catch (err) {
        console.error('Error retrieving invoice from provider:', err);
        return NextResponse.json({ error: 'Failed to retrieve invoice from provider' }, { status: 502 });
    }

  } catch (error) {
    console.error('Download invoice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/tournaments/[code]/invoice', __GET as any);
