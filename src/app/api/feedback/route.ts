import { NextRequest, NextResponse } from 'next/server';
import { FeedbackService } from '@/database/services/feedback.service';
import { sendEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, title, description, email, page, device, browser, userAgent, userId } = body;

    // Validáció
    if (!category || !title || !description || !email) {
      return NextResponse.json(
        { error: 'Hiányzó kötelező mezők' },
        { status: 400 }
      );
    }

    // Email validáció
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Érvénytelen email cím' },
        { status: 400 }
      );
    }

    // User agent és device automatikus felismerés
    const userAgentHeader = request.headers.get('user-agent') || '';
    const detectedDevice = userAgentHeader.includes('Mobile') ? 'mobile' : 
                          userAgentHeader.includes('Tablet') ? 'tablet' : 'desktop';
    
    const detectedBrowser = userAgentHeader.includes('Chrome') ? 'Chrome' :
                           userAgentHeader.includes('Firefox') ? 'Firefox' :
                           userAgentHeader.includes('Safari') ? 'Safari' :
                           userAgentHeader.includes('Edge') ? 'Edge' : 'Unknown';

    // Visszajelzéslétrehozása
    const feedback = await FeedbackService.createFeedback({
      category,
      title,
      description,
      email,
      page: page || request.headers.get('referer') || 'Unknown',
      device: device || detectedDevice,
      browser: browser || detectedBrowser,
      userAgent: userAgent || userAgentHeader,
      userId
    });

    // Visszaigazoló email küldése
    try {
      await sendEmail({
        to: [email],
        subject: `Visszajelzésfogadva: ${title}`,
        text: `Visszajelzésfogadva: ${title}`,
        html: `
          <h2>Köszönjük a hibabejelentést!</h2>
          <p><strong>Kategória:</strong> ${category}</p>
          <p><strong>Cím:</strong> ${title}</p>
          <p><strong>Leírás:</strong> ${description}</p>
          <p><strong>Referencia szám:</strong> ${feedback._id}</p>
          <p><strong>Dátum:</strong> ${new Date().toLocaleDateString('hu-HU')}</p>
          <br>
          <p>Hibabejelentését megkaptuk és hamarosan foglalkozunk vele.</p>
          <p>Ha további információra van szükség, válaszoljon erre az emailre.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Email hiba nem akadályozza a Visszajelzésmentését
    }

    return NextResponse.json({
      success: true,
      message: 'Visszajelzéssikeresen elküldve',
      feedbackId: feedback._id
    });

  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json(
      { error: 'Hiba történt a Visszajelzéslétrehozása során' },
      { status: 500 }
    );
  }
}
