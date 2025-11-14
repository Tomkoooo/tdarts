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

    // Hibabejelentés létrehozása
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
        subject: `Hibabejelentés fogadva: ${title}`,
        text: `Hibabejelentés fogadva: ${title}`,
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
      await sendEmail({
        to: ['toth.tamas@sironic.hu', 'skoda.david@sironic.hu'],
        subject: `Hibabejelentés fogadva: ${title}`,
        text: `Hibabejelentés fogadva: ${title}`,
        html: `
          <h2>Hibabejelentés fogadva: ${title}</h2>
          <p>Kategória: ${category}</p>
          <p>Email: ${email}</p>
          <p>Oldal: ${page}</p>
          <p>Eszköz: ${device}</p>
          <p>Böngésző: ${browser}</p>
          <p>UserAgent: ${userAgent}</p>
          <p>Felhasználó ID: ${userId}</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Email hiba nem akadályozza a hibabejelentés mentését
    }

    return NextResponse.json({
      success: true,
      message: 'Hibabejelentés sikeresen elküldve',
      feedbackId: feedback._id
    });

  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json(
      { error: 'Hiba történt a hibabejelentés létrehozása során' },
      { status: 500 }
    );
  }
}
