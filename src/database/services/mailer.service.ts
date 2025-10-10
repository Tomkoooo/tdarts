import { sendEmail } from '@/lib/mailer';

export class MailerService {
    /**
     * Send email notification when tournament spots become available
     */
    static async sendTournamentSpotAvailableEmail(
        email: string,
        data: {
            tournamentName: string;
            tournamentCode: string;
            freeSpots: number;
            userName: string;
        }
    ): Promise<boolean> {
        try {
            const tournamentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.sironic.hu'}/tournaments/${data.tournamentCode}`;
            
            const subject = `🎯 Szabad hely a ${data.tournamentName} tornán!`;
            
            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #ef4444;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
        }
        .highlight {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .highlight strong {
            color: #ef4444;
            font-size: 18px;
        }
        .cta-button {
            display: inline-block;
            background-color: #ef4444;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #9ca3af;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .footer a {
            color: #ef4444;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 tDarts</div>
            <div class="title">Szabad hely a tornán!</div>
        </div>
        
        <div class="content">
            <p>Kedves ${data.userName}!</p>
            
            <p>Jó hírünk van! A <strong>${data.tournamentName}</strong> tornán szabadult fel hely.</p>
            
            <div class="highlight">
                <strong>${data.freeSpots} szabad hely</strong> érhető el jelenleg!
            </div>
            
            <p>Ne hagyd ki ezt a lehetőséget! A helyek gyorsan betelhetnek, ezért minél hamarabb jelentkezz.</p>
            
            <div style="text-align: center;">
                <a href="${tournamentUrl}" class="cta-button">
                    Jelentkezés a tornára →
                </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                <strong>Torna kód:</strong> ${data.tournamentCode}<br>
                <strong>Szabad helyek:</strong> ${data.freeSpots}
            </p>
        </div>
        
        <div class="footer">
            <p>
                Ha nem szeretnél több értesítést kapni erről a tornáról, 
                <a href="${tournamentUrl}">leiratkozhatsz itt</a>.
            </p>
            <p style="margin-top: 10px;">
                © ${new Date().getFullYear()} tDarts - Magyar Darts Versenyrendszer
            </p>
        </div>
    </div>
</body>
</html>
            `.trim();

            const text = `
Kedves ${data.userName}!

Jó hírünk van! A ${data.tournamentName} tornán szabadult fel hely.

${data.freeSpots} szabad hely érhető el jelenleg!

Ne hagyd ki ezt a lehetőséget! A helyek gyorsan betelhetnek, ezért minél hamarabb jelentkezz.

Jelentkezés: ${tournamentUrl}

Torna kód: ${data.tournamentCode}
Szabad helyek: ${data.freeSpots}

---
Ha nem szeretnél több értesítést kapni erről a tornáról, leiratkozhatsz a torna oldalán.

© ${new Date().getFullYear()} tDarts - Magyar Darts Versenyrendszer
            `.trim();

            return await sendEmail({
                to: [email],
                subject,
                text,
                html
            });
        } catch (error) {
            console.error('Failed to send tournament spot available email:', error);
            throw error;
        }
    }
}

