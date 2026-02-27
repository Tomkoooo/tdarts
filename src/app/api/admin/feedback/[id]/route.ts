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

export async function PATCH(
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

    // First, get the current feedback to check for status changes
    const currentFeedback = await FeedbackService.getFeedbackById(id);
    if (!currentFeedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const statusChanged = status && status !== currentFeedback.status;

    // History Entry
    const historyEntry = {
        action: 'update',
        user: user._id,
        date: new Date(),
        details: `Updated: ${Object.keys(updates).join(', ')}`
    };
    
    // Explicit actions for history
    if (statusChanged) historyEntry.details = `Status changed to ${status}`;
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

    // Add custom message to messages array if provided
    if (customEmailMessage && customEmailMessage.trim()) {
      await FeedbackService.addMessage(
        id,
        {
          sender: user._id.toString(),
          content: customEmailMessage.trim(),
          isInternal: false
        },
        false // isUserAction = false (this is an admin message)
      );
    }

    // Add status change as a system message in chat
    if (statusChanged) {
      const statusLabels: Record<string, string> = {
        'pending': 'Függőben',
        'in-progress': 'Folyamatban',
        'resolved': 'Megoldva',
        'rejected': 'Elutasítva',
        'closed': 'Lezárva'
      };
      await FeedbackService.addMessage(
        id,
        {
          content: `Státusz megváltozott: ${statusLabels[status] || status}`,
          isInternal: false
        },
        false // isUserAction = false
      );
    }

    // Email Handling
    try {
      if (emailNotification !== 'none') {
        const { EmailTemplateService } = await import('@/database/services/emailtemplate.service');
        
        const isCustom = emailNotification === 'custom';
        const defaultSubject = isCustom ? `Válasz a visszajelzésre: ${updatedFeedback.title}` : `Visszajelzés Frissítés: ${updatedFeedback.title}`;
        const subject = isCustom ? (customEmailSubject || defaultSubject) : defaultSubject;
        
        let emailHtml = '';
        let emailText = '';

        if (isCustom && customEmailMessage) {
          // Use database template for custom messages
          const template = await EmailTemplateService.getRenderedTemplate('feedback_admin_reply', {
            customSubject: subject,
            customMessage: customEmailMessage,
            feedbackId: String(updatedFeedback._id),
            feedbackTitle: updatedFeedback.title,
            feedbackStatus: status || updatedFeedback.status,
            feedbackResolution: resolution || '',
            adminNotes: adminNotes || '',
          });

          if (template) {
            emailHtml = template.html;
            emailText = template.text;
          } else {
            // Fallback
            console.warn('Using fallback email template for feedback_admin_reply');
            emailHtml = `
              <h2>Frissítés a visszajelzéssel kapcsolatban</h2>
              <p>${customEmailMessage.replace(/\n/g, '<br>')}</p>
              <br>
              <hr>
              <p><small>Referencia szám: ${updatedFeedback._id}</small></p>
              <p><small>Ez egy automatikus üzenet, kérjük ne válaszoljon rá.</small></p>
            `;
            emailText = `Frissítés a visszajelzéssel kapcsolatban\n\n${customEmailMessage}\n\nReferencia szám: ${updatedFeedback._id}`;
          }
        } else if (emailNotification === 'status' && status) {
          const statusLabels: Record<string, string> = {
            'pending': 'Függőben',
            'in-progress': 'Folyamatban',
            'resolved': 'Megoldva',
            'rejected': 'Elutasítva',
            'closed': 'Lezárva'
          };
          
          emailHtml = `
            <h2>Visszajelzés Státuszváltozás</h2>
            <p><strong>Referencia szám:</strong> ${updatedFeedback._id}</p>
            <p><strong>Cím:</strong> ${updatedFeedback.title}</p>
            <p><strong>Új Státusz:</strong> ${statusLabels[status] || status}</p>
            ${resolution ? `<p><strong>Megoldás:</strong> ${resolution}</p>` : ''}
            ${adminNotes ? `<p><strong>Admin megjegyzés:</strong> ${adminNotes}</p>` : ''}
            <br>
            <p>Köszönjük, hogy segített minket a szolgáltatás fejlesztésében!</p>
          `;
          emailText = `Visszajelzés Státuszváltozás\n\nReferencia szám: ${updatedFeedback._id}\nCím: ${updatedFeedback.title}\nÚj Státusz: ${statusLabels[status] || status}`;
        }
        
        if (emailHtml) {
          await sendEmail({
            to: [updatedFeedback.email],
            subject: subject,
            text: emailText || subject, 
            html: emailHtml,
            resendContext: isCustom
              ? {
                  templateKey: 'feedback_admin_reply',
                  variables: {
                    customSubject: subject,
                    customMessage: customEmailMessage,
                    feedbackId: String(updatedFeedback._id),
                    feedbackTitle: updatedFeedback.title,
                    feedbackStatus: status || updatedFeedback.status,
                    feedbackResolution: resolution || '',
                    adminNotes: adminNotes || '',
                  },
                  locale: 'hu',
                }
              : undefined,
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
