import { NextRequest, NextResponse } from 'next/server';
import { FeedbackService } from '@/database/services/feedback.service';
import { sendEmail } from '@/lib/mailer';
import { AuthService } from '@/database/services/auth.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin jogosultság ellenőrzése
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const feedback = await FeedbackService.getFeedbackById(id);
    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      feedback
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Admin jogosultság ellenőrzése
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, assignedTo, adminNotes, resolution, priority, emailNotification, customEmailMessage, customEmailSubject } = body;

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (resolution !== undefined) updates.resolution = resolution;
    if (priority !== undefined) updates.priority = priority;

    // History Entry
    const historyEntry = {
        action: 'update',
        user: user._id,
        date: new Date(),
        details: `Updated: ${Object.keys(updates).join(', ')}`
    };
    
    // Explicit actions for history
    if (status) historyEntry.details = `Status changed to ${status}`;
    if (customEmailMessage) {
        historyEntry.action = 'reply';
        historyEntry.details = 'Sent email reply';
    }

    // Add to history using $push
    updates.$push = { history: historyEntry };

    const updatedFeedback = await FeedbackService.updateFeedback(
      id,
      updates,
      user._id.toString()
    );

    // Email Handling
    try {
      if (emailNotification !== 'none') {
        const isCustom = emailNotification === 'custom';
        const subject = isCustom ? (customEmailSubject || `Válasz a visszajelzésre: ${updatedFeedback.title}`) : `Visszajelzés Frissítés: ${updatedFeedback.title}`;
        
        let htmlContent = '';

        if (isCustom && customEmailMessage) {
            htmlContent = `
                <h2>Frissítés a visszajelzéssel kapcsolatban</h2>
                <p>${customEmailMessage.replace(/\n/g, '<br>')}</p>
                <br>
                <hr>
                <p><small>Referencia szám: ${updatedFeedback._id}</small></p>
                <p><small>Ez egy automatikus üzenet, kérjük ne válaszoljon rá.</small></p>
            `;
        } else if (emailNotification === 'status' && status) {
             const statusLabels: Record<string, string> = {
                'pending': 'Függőben',
                'in-progress': 'Folyamatban',
                'resolved': 'Megoldva',
                'rejected': 'Elutasítva',
                'closed': 'Lezárva'
            };
            
            htmlContent = `
                <h2>Visszajelzés Státuszváltozás</h2>
                <p><strong>Referencia szám:</strong> ${updatedFeedback._id}</p>
                <p><strong>Cím:</strong> ${updatedFeedback.title}</p>
                <p><strong>Új Státusz:</strong> ${statusLabels[status] || status}</p>
                ${resolution ? `<p><strong>Megoldás:</strong> ${resolution}</p>` : ''}
                ${adminNotes ? `<p><strong>Admin megjegyzés:</strong> ${adminNotes}</p>` : ''}
                <br>
                <p>Köszönjük, hogy segített minket a szolgáltatás fejlesztésében!</p>
            `;
        }
        
        if (htmlContent) {
             await sendEmail({
              to: [updatedFeedback.email],
              subject: subject,
              text: subject, 
              html: htmlContent
            });
        }
      }
    } catch (emailError) {
      console.error('Error sending status update email:', emailError);
    }

    return NextResponse.json({
      success: true,
      feedback: updatedFeedback
    });

  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Admin jogosultság ellenőrzése
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await FeedbackService.deleteFeedback(id);

    return NextResponse.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
