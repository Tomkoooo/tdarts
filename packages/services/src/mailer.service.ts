import { sendEmail } from '@tdarts/core';
import { normalizeEmailLocale, renderMinimalEmailLayout, textToEmailHtml } from '@tdarts/core';

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
            locale?: 'hu' | 'en' | 'de';
        }
    ): Promise<boolean> {
        try {
            const { EmailTemplateService } = await import('./emailtemplate.service');
            
            const tournamentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.sironic.hu'}/tournaments/${data.tournamentCode}`;
            
            // Try to get template from database
            const template = await EmailTemplateService.getRenderedTemplate('tournament_spot_available', {
                tournamentName: data.tournamentName,
                tournamentCode: data.tournamentCode,
                freeSpots: data.freeSpots,
                userName: data.userName,
                tournamentUrl,
                currentYear: new Date().getFullYear(),
            }, {
                locale: data.locale,
            });

            if (template) {
                // Use template from database
                return await sendEmail({
                    to: [email],
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                    resendContext: {
                        templateKey: 'tournament_spot_available',
                        variables: {
                            tournamentName: data.tournamentName,
                            tournamentCode: data.tournamentCode,
                            freeSpots: data.freeSpots,
                            userName: data.userName,
                            tournamentUrl,
                            currentYear: new Date().getFullYear(),
                        },
                        locale: data.locale || template.locale,
                    },
                });
            }

            // Fallback to hardcoded template if database template not found
            console.warn('Using fallback email template for tournament_spot_available');
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
                html,
                resendContext: {
                    templateKey: 'tournament_spot_available',
                    variables: {
                        tournamentName: data.tournamentName,
                        tournamentCode: data.tournamentCode,
                        freeSpots: data.freeSpots,
                        userName: data.userName,
                        tournamentUrl,
                        currentYear: new Date().getFullYear(),
                    },
                    locale: data.locale,
                },
            });
        } catch (error) {
            console.error('Failed to send tournament spot available email:', error);
            throw error;
        }
    }

    /**
     * Send email notification for new club registration
     */
    static async sendClubRegistrationEmail(
        email: string,
        data: {
            clubName: string;
            password: string;
            loginUrl: string;
            clubUrl: string;
            profileUrl: string;
            howItWorksUrl: string;
            locale?: 'hu' | 'en' | 'de';
        }
    ): Promise<boolean> {
        try {
            const { EmailTemplateService } = await import('./emailtemplate.service');
            
            // Try to get template from database
            const template = await EmailTemplateService.getRenderedTemplate('club_registration', {
                clubName: data.clubName,
                email,
                password: data.password,
                loginUrl: data.loginUrl,
                clubUrl: data.clubUrl,
                profileUrl: data.profileUrl,
                howItWorksUrl: data.howItWorksUrl,
                currentYear: new Date().getFullYear(),
            }, {
                locale: data.locale,
            });

            if (template) {
                return await sendEmail({
                    to: [email],
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                    resendContext: {
                        templateKey: 'club_registration',
                        variables: {
                            clubName: data.clubName,
                            email,
                            password: data.password,
                            loginUrl: data.loginUrl,
                            clubUrl: data.clubUrl,
                            profileUrl: data.profileUrl,
                            howItWorksUrl: data.howItWorksUrl,
                            currentYear: new Date().getFullYear(),
                        },
                        locale: data.locale || template.locale,
                    },
                });
            }

            // Fallback to hardcoded template
            console.warn('Using fallback email template for club_registration');
            const subject = `🎯 Üdvözlünk a tDarts-ban, ${data.clubName}!`;
            
            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        .container { background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #ef4444; margin-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
        .content { font-size: 16px; color: #4b5563; margin-bottom: 30px; }
        .highlight { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .cta-button { display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; text-align: center; margin: 20px 0; }
        .footer { text-align: center; font-size: 14px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .link-list { margin: 20px 0; padding: 0; list-style: none; }
        .link-list li { margin-bottom: 10px; }
        .link-list a { color: #ef4444; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">tDarts</div>
            <div class="title">Sikeres regisztráció!</div>
        </div>
        
        <div class="content">
            <p>Kedves <strong>${data.clubName}</strong>!</p>
            
            <p>Örömmel értesítünk, hogy létrehoztuk a klubod tDarts fiókját és rögzítettük az egyesületet a rendszerünkben. Az OAC liga is hozzáadásra került a klubodhoz.</p>
            
            <div class="highlight">
                <strong>Bejelentkezési adatok:</strong><br>
                Email: ${email}<br>
                Jelszó: ${data.password}
            </div>
            
            <p>Kérjük, az alábbi linkeken érheted el a legfontosabb funkciókat:</p>
            
            <ul class="link-list">
                <li>🔗 <a href="${data.loginUrl}">Bejelentkezés</a></li>
                <li>🛡️ <a href="${data.clubUrl}">Klub Dashboard (Helyszínek, bajnokságok kezelése)</a></li>
                <li>👤 <a href="${data.profileUrl}">Fiók és Jelszó szerkesztése</a></li>
                <li>📖 <a href="${data.howItWorksUrl}">Hogyan működik? (Útmutató)</a></li>
            </ul>
            
            <p>Javasoljuk, hogy az első bejelentkezés után változtasd meg a jelszavadat a profiloldaladon.</p>
            
            <div style="text-align: center;">
                <a href="${data.loginUrl}" class="cta-button">
                    Bejelentkezés →
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>
            `.trim();

            const text = `
Üdvözlünk a tDarts-ban, ${data.clubName}!

Létrehoztuk a klubod tDarts fiókját és az egyesületet a rendszerünkben. Az OAC liga is elérhető.

Bejelentkezési adatok:
Email: ${email}
Jelszó: ${data.password}

Hasznos linkek:
Bejelentkezés: ${data.loginUrl}
Klub kezelése: ${data.clubUrl}
Profil szerkesztése: ${data.profileUrl}
Útmutató: ${data.howItWorksUrl}

Üdvözlettel,
tDarts Csapat
            `.trim();

            return await sendEmail({
                to: [email],
                subject,
                text,
                html,
                resendContext: {
                    templateKey: 'club_registration',
                    variables: {
                        clubName: data.clubName,
                        email,
                        password: data.password,
                        loginUrl: data.loginUrl,
                        clubUrl: data.clubUrl,
                        profileUrl: data.profileUrl,
                        howItWorksUrl: data.howItWorksUrl,
                        currentYear: new Date().getFullYear(),
                    },
                    locale: data.locale,
                },
            });
        } catch (error) {
            console.error('Failed to send club registration email:', error);
            throw error;
        }
    }

    /**
     * Send email notification for existing club verification
     */
    static async sendClubVerificationEmail(
        email: string,
        data: {
            clubName: string;
            clubUrl: string;
            locale?: 'hu' | 'en' | 'de';
        }
    ): Promise<boolean> {
        try {
            const { EmailTemplateService } = await import('./emailtemplate.service');
            
            // Try to get template from database
            const template = await EmailTemplateService.getRenderedTemplate('club_verification', {
                clubName: data.clubName,
                clubUrl: data.clubUrl,
                currentYear: new Date().getFullYear(),
            }, {
                locale: data.locale,
            });

            if (template) {
                return await sendEmail({
                    to: [email],
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                    resendContext: {
                        templateKey: 'club_verification',
                        variables: {
                            clubName: data.clubName,
                            clubUrl: data.clubUrl,
                            currentYear: new Date().getFullYear(),
                        },
                        locale: data.locale || template.locale,
                    },
                });
            }

            // Fallback to hardcoded template
            console.warn('Using fallback email template for club_verification');
            const subject = `🎯 Klub verifikáció és OAC Liga - ${data.clubName}`;
            
            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        .container { background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #ef4444; margin-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
        .content { font-size: 16px; color: #4b5563; margin-bottom: 30px; }
        .cta-button { display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; text-align: center; margin: 20px 0; }
        .footer { text-align: center; font-size: 14px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo"> tDarts</div>
            <div class="title">Klubod verifikálva!</div>
        </div>
        
        <div class="content">
            <p>Kedves <strong>${data.clubName}</strong>!</p>
            
            <p>Örömmel értesítünk, hogy a már meglévő klubodat verifikáltuk a rendszerben, és hozzáadtuk az OAC országos ligát a választható versenyek közé.</p>
            
            <p>Mostantól jogosult vagy OAC verifikált versenyeket indítani.</p>
            
            <div style="text-align: center;">
                <a href="${data.clubUrl}" class="cta-button">
                    Klub Dashboard →
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>
            `.trim();

            const text = `
Kedves ${data.clubName}!

Klubodat verifikáltuk a rendszerben, és hozzáadtuk az OAC országos ligát.
Mostantól jogosult vagy OAC verifikált versenyeket indítani.

Klub Dashboard: ${data.clubUrl}

Üdvözlettel,
tDarts Csapat
            `.trim();

            return await sendEmail({
                to: [email],
                subject,
                text,
                html,
                resendContext: {
                    templateKey: 'club_verification',
                    variables: {
                        clubName: data.clubName,
                        clubUrl: data.clubUrl,
                        currentYear: new Date().getFullYear(),
                    },
                    locale: data.locale,
                },
            });
        } catch (error) {
            console.error('Failed to send club verification email:', error);
            throw error;
        }
    }
    /**
     * Send email notification for tournament day reminder
     */
    static async sendTournamentReminderEmail(
        email: string,
        data: {
            tournamentName: string;
            tournamentCode: string;
            tournamentDate: string;
            userName: string;
            locale?: 'hu' | 'en' | 'de';
        }
    ): Promise<boolean> {
        try {
            const { EmailTemplateService } = await import('./emailtemplate.service');
            const tournamentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.sironic.hu'}/tournaments/${data.tournamentCode}`;
            
            const template = await EmailTemplateService.getRenderedTemplate('tournament_reminder', {
                tournamentName: data.tournamentName,
                tournamentDate: data.tournamentDate,
                tournamentUrl,
                userName: data.userName,
                currentYear: new Date().getFullYear(),
            }, {
                locale: data.locale,
            });

            if (template) {
                return await sendEmail({
                    to: [email],
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                    resendContext: {
                        templateKey: 'tournament_reminder',
                        variables: {
                            tournamentName: data.tournamentName,
                            tournamentDate: data.tournamentDate,
                            tournamentUrl,
                            userName: data.userName,
                            currentYear: new Date().getFullYear(),
                        },
                        locale: data.locale || template.locale,
                    },
                });
            }

            const locale = normalizeEmailLocale(data.locale);
            const fallbackSubject =
                locale === 'en'
                    ? `🎯 Reminder: Your tournament is today! - ${data.tournamentName}`
                    : `🎯 Emlékeztető: Ma versenyed van! - ${data.tournamentName}`;
            const fallbackText =
                locale === 'en'
                    ? `Dear ${data.userName}!\n\nThis is a reminder that your tournament ${data.tournamentName} is happening today.\n\nTime: ${data.tournamentDate}\nDetails: ${tournamentUrl}\n\nGood luck!\ntDarts Team`
                    : `Kedves ${data.userName}!\n\nEmlékeztetni szeretnénk, hogy ma kerül megrendezésre a ${data.tournamentName} verseny!\n\nIdőpont: ${data.tournamentDate}\nTovábbi részletek: ${tournamentUrl}\n\nSok sikert a versenyen!\ntDarts Csapat`;

            // Fallback
            return await sendEmail({
                to: [email],
                subject: fallbackSubject,
                text: fallbackText,
                html: renderMinimalEmailLayout({
                    locale,
                    title: fallbackSubject,
                    heading: fallbackSubject,
                    bodyHtml: textToEmailHtml(fallbackText),
                }),
                resendContext: {
                    templateKey: 'tournament_reminder',
                    variables: {
                        tournamentName: data.tournamentName,
                        tournamentDate: data.tournamentDate,
                        tournamentUrl,
                        userName: data.userName,
                        currentYear: new Date().getFullYear(),
                    },
                    locale,
                },
            });
        } catch (error) {
            console.error('Failed to send tournament reminder email:', error);
            throw error;
        }
    }

    /**
     * Send email verification code
     */
    static async sendVerificationEmail(
        email: string,
        data: {
            userName: string;
            verificationCode: string;
            locale?: 'hu' | 'en' | 'de';
        }
    ): Promise<boolean> {
        try {
            const { EmailTemplateService } = await import('./emailtemplate.service');
            
            const template = await EmailTemplateService.getRenderedTemplate('email_verification', {
                userName: data.userName,
                verificationCode: data.verificationCode,
                currentYear: new Date().getFullYear(),
            }, {
                locale: data.locale,
            });

            if (template) {
                return await sendEmail({
                    to: [email],
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                    resendContext: {
                        templateKey: 'email_verification',
                        variables: {
                            userName: data.userName,
                            verificationCode: data.verificationCode,
                            currentYear: new Date().getFullYear(),
                        },
                        locale: data.locale || template.locale,
                    },
                });
            }

            const locale = normalizeEmailLocale(data.locale);
            const fallbackSubject = locale === 'en' ? '🎯 tDarts Email Verification' : '🎯 TDarts Email Verifikáció';
            const fallbackText =
                locale === 'en'
                    ? `Dear ${data.userName}!\n\nUse this verification code to confirm your email address:\n\n${data.verificationCode}`
                    : `Kedves ${data.userName}!\n\nKérjük, erősítse meg email címét az alábbi verifikációs kóddal:\n\n${data.verificationCode}`;

            // Fallback
            return await sendEmail({
                to: [email],
                subject: fallbackSubject,
                html: renderMinimalEmailLayout({
                    locale,
                    title: fallbackSubject,
                    heading: fallbackSubject,
                    bodyHtml: `<p>${locale === 'en' ? `Dear ${data.userName}!` : `Kedves ${data.userName}!`}</p><p>${locale === 'en' ? 'Use this code to verify your email address:' : 'Kérjük, használd az alábbi kódot az email címed megerősítéséhez:'}</p><p style="font-size:24px;font-weight:700;letter-spacing:0.12em;">${data.verificationCode}</p>`,
                }),
                text: fallbackText,
                resendContext: {
                    templateKey: 'email_verification',
                    variables: {
                        userName: data.userName,
                        verificationCode: data.verificationCode,
                        currentYear: new Date().getFullYear(),
                    },
                    locale,
                },
            });
        } catch (error) {
            console.error('Failed to send verification email:', error);
            throw error;
        }
    }

    /**
     * Send password reset code
     */
    static async sendPasswordResetEmail(
        email: string,
        data: {
            userName: string;
            resetCode: string;
            locale?: 'hu' | 'en' | 'de';
        }
    ): Promise<boolean> {
        try {
            const { EmailTemplateService } = await import('./emailtemplate.service');
            
            const template = await EmailTemplateService.getRenderedTemplate('password_reset', {
                userName: data.userName,
                resetCode: data.resetCode,
                currentYear: new Date().getFullYear(),
            }, {
                locale: data.locale,
            });

            if (template) {
                return await sendEmail({
                    to: [email],
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                    resendContext: {
                        templateKey: 'password_reset',
                        variables: {
                            userName: data.userName,
                            resetCode: data.resetCode,
                            currentYear: new Date().getFullYear(),
                        },
                        locale: data.locale || template.locale,
                    },
                });
            }

            const locale = normalizeEmailLocale(data.locale);
            const fallbackSubject = locale === 'en' ? '🎯 tDarts Password Reset' : '🎯 TDarts Jelszó Visszaállítás';
            const fallbackText =
                locale === 'en'
                    ? `Dear ${data.userName}!\n\nUse the following code to reset your password:\n\n${data.resetCode}`
                    : `Kedves ${data.userName}!\n\nKérjük, használja az alábbi kódot a jelszó visszaállításához:\n\n${data.resetCode}`;

            // Fallback
            return await sendEmail({
                to: [email],
                subject: fallbackSubject,
                html: renderMinimalEmailLayout({
                    locale,
                    title: fallbackSubject,
                    heading: fallbackSubject,
                    bodyHtml: `<p>${locale === 'en' ? `Dear ${data.userName}!` : `Kedves ${data.userName}!`}</p><p>${locale === 'en' ? 'Use this code to reset your password:' : 'Kérjük, használd az alábbi kódot a jelszó visszaállításához:'}</p><p style="font-size:24px;font-weight:700;letter-spacing:0.12em;">${data.resetCode}</p>`,
                }),
                text: fallbackText,
                resendContext: {
                    templateKey: 'password_reset',
                    variables: {
                        userName: data.userName,
                        resetCode: data.resetCode,
                        currentYear: new Date().getFullYear(),
                    },
                    locale,
                },
            });
        } catch (error) {
            console.error('Failed to send password reset email:', error);
            throw error;
        }
    }
}

