/**
 * Seed script to populate the database with default email templates
 * Run this script once to initialize email templates in the database
 * 
 * Usage: npx tsx src/database/scripts/seed-email-templates.ts
 */

import * as dotenv from 'dotenv';
import { connectMongo } from '@/lib/mongoose';
import { EmailTemplateModel } from '@/database/models/emailtemplate.model';

// Load environment variables
dotenv.config();

const defaultTemplates = [
  {
    key: 'tournament_spot_available',
    name: 'Tournament Spot Available',
    description: 'Notifies users when spots become available in a tournament they are interested in',
    category: 'tournament',
    subject: '🎯 Szabad hely a {tournamentName} tornán!',
    variables: ['tournamentName', 'tournamentCode', 'freeSpots', 'userName', 'tournamentUrl', 'currentYear'],
    textContent: `Kedves {userName}!

Jó hírünk van! A {tournamentName} tornán szabadult fel hely.

{freeSpots} szabad hely érhető el jelenleg!

Ne hagyd ki ezt a lehetőséget! A helyek gyorsan betelhetnek, ezért minél hamarabb jelentkezz.

Jelentkezés: {tournamentUrl}

Torna kód: {tournamentCode}
Szabad helyek: {freeSpots}

---
Ha nem szeretnél több értesítést kapni erről a tornáról, leiratkozhatsz a torna oldalán.

© {currentYear} tDarts - Magyar Darts Versenyrendszer`,
    htmlContent: `<!DOCTYPE html>
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
            <p>Kedves {userName}!</p>
            
            <p>Jó hírünk van! A <strong>{tournamentName}</strong> tornán szabadult fel hely.</p>
            
            <div class="highlight">
                <strong>{freeSpots} szabad hely</strong> érhető el jelenleg!
            </div>
            
            <p>Ne hagyd ki ezt a lehetőséget! A helyek gyorsan betelhetnek, ezért minél hamarabb jelentkezz.</p>
            
            <div style="text-align: center;">
                <a href="{tournamentUrl}" class="cta-button">
                    Jelentkezés a tornára →
                </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                <strong>Torna kód:</strong> {tournamentCode}<br>
                <strong>Szabad helyek:</strong> {freeSpots}
            </p>
        </div>
        
        <div class="footer">
            <p>
                Ha nem szeretnél több értesítést kapni erről a tornáról, 
                <a href="{tournamentUrl}">leiratkozhatsz itt</a>.
            </p>
            <p style="margin-top: 10px;">
                © {currentYear} tDarts - Magyar Darts Versenyrendszer
            </p>
        </div>
    </div>
</body>
</html>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'club_registration',
    name: 'Club Registration Welcome',
    description: 'Welcome email sent to new clubs after successful registration',
    category: 'club',
    subject: '🎯 Üdvözlünk a tDarts-ban, {clubName}!',
    variables: ['clubName', 'email', 'password', 'loginUrl', 'clubUrl', 'profileUrl', 'howItWorksUrl', 'currentYear'],
    textContent: `Üdvözlünk a tDarts-ban, {clubName}!

Létrehoztuk a klubod tDarts fiókját és az egyesületet a rendszerünkben. Az OAC liga is elérhető.

Bejelentkezési adatok:
Email: {email}
Jelszó: {password}

Hasznos linkek:
Bejelentkezés: {loginUrl}
Klub kezelése: {clubUrl}
Profil szerkesztése: {profileUrl}
Útmutató: {howItWorksUrl}

Üdvözlettel,
tDarts Csapat`,
    htmlContent: `<!DOCTYPE html>
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
            <p>Kedves <strong>{clubName}</strong>!</p>
            
            <p>Örömmel értesítünk, hogy létrehoztuk a klubod tDarts fiókját és rögzítettük az egyesületet a rendszerünkben. Az OAC liga is hozzáadásra került a klubodhoz.</p>
            
            <div class="highlight">
                <strong>Bejelentkezési adatok:</strong><br>
                Email: {email}<br>
                Jelszó: {password}
            </div>
            
            <p>Kérjük, az alábbi linkeken érheted el a legfontosabb funkciókat:</p>
            
            <ul class="link-list">
                <li>🔗 <a href="{loginUrl}">Bejelentkezés</a></li>
                <li>🛡️ <a href="{clubUrl}">Klub Dashboard (Helyszínek, bajnokságok kezelése)</a></li>
                <li>👤 <a href="{profileUrl}">Fiók és Jelszó szerkesztése</a></li>
                <li>📖 <a href="{howItWorksUrl}">Hogyan működik? (Útmutató)</a></li>
            </ul>
            
            <p>Javasoljuk, hogy az első bejelentkezés után változtasd meg a jelszavadat a profiloldaladon.</p>
            
            <div style="text-align: center;">
                <a href="{loginUrl}" class="cta-button">
                    Bejelentkezés →
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>© {currentYear} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'club_verification',
    name: 'Club Verification',
    description: 'Confirmation email for existing clubs being verified and added to OAC league',
    category: 'club',
    subject: '🎯 Klub verifikáció és OAC Liga - {clubName}',
    variables: ['clubName', 'clubUrl', 'currentYear'],
    textContent: `Kedves {clubName}!

Klubodat verifikáltuk a rendszerben, és hozzáadtuk az OAC országos ligát.
Mostantól jogosult vagy OAC verifikált versenyeket indítani.

Klub Dashboard: {clubUrl}

Üdvözlettel,
tDarts Csapat`,
    htmlContent: `<!DOCTYPE html>
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
            <p>Kedves <strong>{clubName}</strong>!</p>
            
            <p>Örömmel értesítünk, hogy a már meglévő klubodat verifikáltuk a rendszerben, és hozzáadtuk az OAC országos ligát a választható versenyek közé.</p>
            
            <p>Mostantól jogosult vagy OAC verifikált versenyeket indítani.</p>
            
            <div style="text-align: center;">
                <a href="{clubUrl}" class="cta-button">
                    Klub Dashboard →
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>© {currentYear} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'player_tournament_notification',
    name: 'Player Tournament Notification',
    description: 'Custom notification sent by club admins to tournament players',
    category: 'tournament',
    subject: '[{tournamentName}] {customSubject}',
    variables: ['tournamentName', 'playerName', 'customSubject', 'customMessage', 'language'],
    textContent: `Kedves {playerName}!

A {tournamentName} verseny kapcsán szeretnénk értesíteni Önt a következőről:

{customSubject}
{customMessage}

Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba velünk.

Üdvözlettel,
A tDarts csapat`,
    htmlContent: `<div class="email-content" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #b62441 0%, #8a1b31 100%); color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
      tDarts - Verseny Értesítés
    </h1>
  </div>
  
  <!-- Content -->
  <div style="padding: 30px;">
    <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Kedves {playerName}!</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
      A {tournamentName} verseny kapcsán szeretnénk értesíteni Önt a következőről:
    </p>
    <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
      <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">{customSubject}</h3>
      <p style="color: #374151; margin: 0; white-space: pre-line;">{customMessage}</p>
    </div>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
      Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba velünk.
    </p>
    <p style="color: #374151; line-height: 1.6;">
      Üdvözlettel,<br>
      A tDarts csapat
    </p>
  </div>
  
  <!-- Footer -->
  <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      © 2024 tDarts. Minden jog fenntartva.
    </p>
  </div>
</div>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'admin_user_notification',
    name: 'Admin to User Notification',
    description: 'General notification sent from admin to any user',
    category: 'admin',
    subject: '[tDarts Admin] {customSubject}',
    variables: ['userName', 'customSubject', 'customMessage', 'language'],
    textContent: `Kedves {userName}!

A tDarts platform adminisztrátoraként szeretnénk értesíteni Önt a következőről:

{customSubject}
{customMessage}

Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba velünk.

Üdvözlettel,
A tDarts admin csapat`,
    htmlContent: `<div class="email-content" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #b62441 0%, #8a1b31 100%); color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
      tDarts - Admin Értesítés
    </h1>
  </div>
  
  <!-- Content -->
  <div style="padding: 30px;">
    <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Kedves {userName}!</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
      A tDarts platform adminisztrátoraként szeretnénk értesíteni Önt a következőről:
    </p>
    <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
      <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">{customSubject}</h3>
      <p style="color: #374151; margin: 0; white-space: pre-line;">{customMessage}</p>
    </div>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
      Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba velünk.
    </p>
    <p style="color: #374151; line-height: 1.6;">
      Üdvözlettel,<br>
      A tDarts admin csapat
    </p>
  </div>
  
  <!-- Footer -->
  <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      © 2024 tDarts. Minden jog fenntartva.
    </p>
  </div>
</div>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'feedback_confirmation',
    name: 'Feedback Confirmation',
    description: 'Auto-reply sent when user submits feedback/bug report',
    category: 'feedback',
    subject: 'Visszajelzés fogadva: {feedbackTitle}',
    variables: ['feedbackCategory', 'feedbackTitle', 'feedbackDescription', 'feedbackId', 'currentDate'],
    textContent: `Köszönjük a hibabejelentést!

Kategória: {feedbackCategory}
Cím: {feedbackTitle}
Leírás: {feedbackDescription}
Referencia szám: {feedbackId}
Dátum: {currentDate}

Hibabejelentését megkaptuk és hamarosan foglalkozunk vele.
Ha további információra van szükség, válaszoljon erre az emailre.`,
    htmlContent: `<h2>Köszönjük a hibabejelentést!</h2>
<p><strong>Kategória:</strong> {feedbackCategory}</p>
<p><strong>Cím:</strong> {feedbackTitle}</p>
<p><strong>Leírás:</strong> {feedbackDescription}</p>
<p><strong>Referencia szám:</strong> {feedbackId}</p>
<p><strong>Dátum:</strong> {currentDate}</p>
<br>
<p>Hibabejelentését megkaptuk és hamarosan foglalkozunk vele.</p>
<p>Ha további információra van szükség, válaszoljon erre az emailre.</p>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'feedback_admin_reply',
    name: 'Feedback Admin Reply',
    description: 'Reply sent by admin to user feedback with custom message or status update',
    category: 'feedback',
    subject: '{customSubject}',
    variables: ['customSubject', 'customMessage', 'feedbackId', 'feedbackTitle', 'feedbackStatus', 'feedbackResolution', 'adminNotes'],
    textContent: `Frissítés a visszajelzéssel kapcsolatban

{customMessage}

Referencia szám: {feedbackId}
Ez egy automatikus üzenet, kérjük ne válaszoljon rá.`,
    htmlContent: `<h2>Frissítés a visszajelzéssel kapcsolatban</h2>
<p>{customMessage}</p>
<br>
<hr>
<p><small>Referencia szám: {feedbackId}</small></p>
<p><small>Ez egy automatikus üzenet, kérjük ne válaszoljon rá.</small></p>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'tournament_reminder',
    name: 'Tournament Day Reminder',
    description: 'Sent on the day of a tournament to all subscribed players and users',
    category: 'tournament',
    subject: '🎯 Emlékeztető: Ma versenyed van! - {tournamentName}',
    variables: ['tournamentName', 'tournamentDate', 'tournamentUrl', 'userName', 'currentYear'],
    textContent: `Kedves {userName}!

Emlékeztetni szeretnénk, hogy ma kerül megrendezésre a {tournamentName} verseny!

Időpont: {tournamentDate}
További részletek: {tournamentUrl}

Sok sikert a versenyen!
tDarts Csapat`,
    htmlContent: `<!DOCTYPE html>
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 tDarts</div>
            <div class="title">Ma versenyed van!</div>
        </div>
        
        <div class="content">
            <p>Kedves <strong>{userName}</strong>!</p>
            
            <p>Emlékeztetni szeretnénk, hogy ma kerül megrendezésre a <strong>{tournamentName}</strong> verseny, amire feliratkoztál vagy amin részt veszel.</p>
            
            <div class="highlight">
                <strong>Időpont:</strong> {tournamentDate}
            </div>
            
            <p>Készítsd a nyilakat, és sok sikert kívánunk a tábla előtt!</p>
            
            <div style="text-align: center;">
                <a href="{tournamentUrl}" class="cta-button">
                    Verseny adatlapja →
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>© {currentYear} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'email_verification',
    name: 'Email Verification',
    description: 'Verification code sent to users after registration',
    category: 'auth',
    subject: '🎯 TDarts Email Verifikáció',
    variables: ['userName', 'verificationCode', 'currentYear'],
    textContent: `Kedves {userName}!

Köszönjük a regisztrációt a TDarts-ban! Kérjük, erősítse meg email címét az alábbi verifikációs kóddal:

{verificationCode}

Adja meg ezt a kódot a TDarts weboldalon az email cím megerősítéséhez.

Üdvözlettel,
TDarts Csapat`,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #f2f2f2; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c1414; }
        .container { background-color: #1a2424; border-radius: 8px; padding: 30px; border: 1px solid #333; }
        .logo { font-size: 32px; font-weight: bold; color: #cc3333; margin-bottom: 20px; text-align: center; }
        .code { font-size: 36px; font-weight: bold; color: #cc3333; text-align: center; letter-spacing: 5px; margin: 30px 0; background: #0c1414; padding: 15px; border-radius: 4px; }
        .footer { text-align: center; font-size: 14px; color: #888; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎯 TDarts</div>
        <h2>Email Verifikáció</h2>
        <p>Kedves {userName}!</p>
        <p>Köszönjük, hogy regisztráltál a TDarts rendszerébe. Kérjük, használd az alábbi kódot az email címed megerősítéséhez:</p>
        
        <div class="code">{verificationCode}</div>
        
        <p>Ha nem te kezdeményezted a regisztrációt, kérjük, hagyd figyelmen kívül ezt az üzenetet.</p>
        
        <div class="footer">
            <p>© {currentYear} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'password_reset',
    name: 'Password Reset',
    description: 'Reset code sent to users who forgot their password',
    category: 'auth',
    subject: '🎯 TDarts Jelszó Visszaállítás',
    variables: ['userName', 'resetCode', 'currentYear'],
    textContent: `Kedves {userName}!

Jelszó visszaállítást kezdeményeztek a fiókjához. Kérjük, használja az alábbi kódot a jelszó visszaállításához:

{resetCode}

Adja meg ezt a kódot a TDarts weboldalon az új jelszó megadásához.

Üdvözlettel,
TDarts Csapat`,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #f2f2f2; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c1414; }
        .container { background-color: #1a2424; border-radius: 8px; padding: 30px; border: 1px solid #333; }
        .logo { font-size: 32px; font-weight: bold; color: #cc3333; margin-bottom: 20px; text-align: center; }
        .code { font-size: 36px; font-weight: bold; color: #cc3333; text-align: center; letter-spacing: 5px; margin: 30px 0; background: #0c1414; padding: 15px; border-radius: 4px; }
        .footer { text-align: center; font-size: 14px; color: #888; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎯 TDarts</div>
        <h2>Jelszó Visszaállítás</h2>
        <p>Kedves {userName}!</p>
        <p>Jelszó visszaállítást kértél a TDarts fiókodhoz. Használd az alábbi kódot a folyamat befejezéséhez:</p>
        
        <div class="code">{resetCode}</div>
        
        <p>Ha nem te kérted a visszaállítást, biztonsági okokból javasoljuk, hogy ellenőrizd a fiókod biztonságát.</p>
        
        <div class="footer">
            <p>© {currentYear} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'team_invitation',
    name: 'Team Invitation',
    description: 'Sent when a player invites someone to form a team for a tournament',
    category: 'tournament',
    subject: '🎯 {inviterName} meghívott egy csapatba - {tournamentName}',
    variables: ['inviterName', 'inviteeName', 'teamName', 'tournamentName', 'tournamentUrl', 'acceptUrl', 'declineUrl', 'currentYear'],
    textContent: `Kedves {inviteeName}!

{inviterName} meghívott, hogy társként vegyél részt a {tournamentName} tornán.

Csapat név: {teamName}
Torna: {tournamentName}

Ha elfogadod a meghívást, klikkelj ide: {acceptUrl}
Ha elutasítod a meghívást, klikkelj ide: {declineUrl}

További információk a tornáról: {tournamentUrl}

Üdvözlettel,
tDarts Csapat
© {currentYear} tDarts - Magyar Darts Versenyrendszer`,
    htmlContent: `<!DOCTYPE html>
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
        .cta-button { display: inline-block; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; text-align: center; margin: 10px 5px; }
        .btn-accept { background-color: #10b981; }
        .btn-decline { background-color: #ef4444; }
        .footer { text-align: center; font-size: 14px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 tDarts</div>
            <div class="title">Csapat Meghívó</div>
        </div>
        
        <div class="content">
            <p>Kedves <strong>{inviteeName}</strong>!</p>
            
            <p><strong>{inviterName}</strong> meghívott, hogy társként vegyél részt a <strong>{tournamentName}</strong> tornán.</p>
            
            <div class="highlight">
                <strong>Csapat név:</strong> {teamName}<br>
                <strong>Torna:</strong> {tournamentName}
            </div>
            
            <p>Kérjük, válaszd ki, hogy elfogadod-e a meghívást:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{acceptUrl}" class="cta-button btn-accept">
                    ✓ Elfogadom
                </a>
                <a href="{declineUrl}" class="cta-button btn-decline">
                    ✗ Elutasítom
                </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
                További információk a tornáról: <a href="{tournamentUrl}" style="color: #ef4444;">{tournamentUrl}</a>
            </p>
        </div>
        
        <div class="footer">
            <p>© {currentYear} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'team_invitation_accepted',
    name: 'Team Invitation Accepted',
    description: 'Sent to the inviter when their team invitation is accepted',
    category: 'tournament',
    subject: '✅ {accepterName} elfogadta a csapat meghívót - {teamName}',
    variables: ['inviterName', 'accepterName', 'teamName', 'tournamentName', 'tournamentUrl', 'currentYear'],
    textContent: `Kedves {inviterName}!

Jó hírünk van! {accepterName} elfogadta a meghívást a csapatba.

Csapat név: {teamName}
Torna: {tournamentName}

Most már párosban nevez registered a tornára. További részletek: {tournamentUrl}

Sok sikert a versenyen!
tDarts Csapat
© {currentYear} tDarts - Magyar Darts Versenyrendszer`,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        .container { background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #ef4444; margin-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 20px; }
        .content { font-size: 16px; color: #4b5563; margin-bottom: 30px; }
        .highlight { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .cta-button { display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; text-align: center; margin: 20px 0; }
        .footer { text-align: center; font-size: 14px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 tDarts</div>
            <div class="title">✅ Meghívás Elfogadva!</div>
        </div>
        
        <div class="content">
            <p>Kedves <strong>{inviterName}</strong>!</p>
            
            <p>Jó hírünk van! <strong>{accepterName}</strong> elfogadta a meghívást a csapatba.</p>
            
            <div class="highlight">
                <strong>Csapat név:</strong> {teamName}<br>
                <strong>Torna:</strong> {tournamentName}
            </div>
            
            <p>Most már párosban neveztetek a tornára. Sok sikert kívánunk a versenyen!</p>
            
            <div style="text-align: center;">
                <a href="{tournamentUrl}" class="cta-button">
                    Torna adatlapja →
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>© {currentYear} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'team_invitation_declined',
    name: 'Team Invitation Declined',
    description: 'Sent to the inviter when their team invitation is declined',
    category: 'tournament',
    subject: '❌ {declinerName} elutasította a csapat meghívót',
    variables: ['inviterName', 'declinerName', 'teamName', 'tournamentName', 'currentYear'],
    textContent: `Kedves {inviterName}!

Sajnálattal értesítünk, hogy {declinerName} elutasította a meghívást a csapatba.

Csapat név: {teamName}
Torna: {tournamentName}

Kereshetsz másik társat a tornára.

tDarts Csapat
© {currentYear} tDarts - Magyar Darts Versenyrendszer`,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        .container { background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #ef4444; margin-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; color: #ef4444; margin-bottom: 20px; }
        .content { font-size: 16px; color: #4b5563; margin-bottom: 30px; }
        .highlight { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; font-size: 14px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 tDarts</div>
            <div class="title">❌ Meghívás Elutasítva</div>
        </div>
        
        <div class="content">
            <p>Kedves <strong>{inviterName}</strong>!</p>
            
            <p>Sajnálattal értesítünk, hogy <strong>{declinerName}</strong> elutasította a meghívást a csapatba.</p>
            
            <div class="highlight">
                <strong>Csapat név:</strong> {teamName}<br>
                <strong>Torna:</strong> {tournamentName}
            </div>
            
            <p>Kereshetsz másik társat a tornára.</p>
        </div>
        
        <div class="footer">
            <p>© {currentYear} tDarts - Magyar Darts Versenyrendszer</p>
        </div>
    </div>
</body>
</html>`,
    isActive: true,
    isDefault: true,
  },
];

const englishTemplateVariants = [
  {
    key: 'email_verification',
    locale: 'en',
    name: 'Email Verification (EN)',
    description: 'English verification code email',
    category: 'auth',
    subject: '🎯 tDarts Email Verification',
    variables: ['userName', 'verificationCode', 'currentYear'],
    textContent: `Dear {userName},

Use this code to verify your email address:
{verificationCode}

Best regards,
tDarts Team`,
    htmlContent: `<p>Dear {userName},</p><p>Use this code to verify your email address:</p><p style="font-size:24px;font-weight:bold;letter-spacing:0.1em;">{verificationCode}</p><p>Best regards,<br/>tDarts Team</p>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'password_reset',
    locale: 'en',
    name: 'Password Reset (EN)',
    description: 'English password reset code email',
    category: 'auth',
    subject: '🎯 tDarts Password Reset',
    variables: ['userName', 'resetCode', 'currentYear'],
    textContent: `Dear {userName},

Use this code to reset your password:
{resetCode}

Best regards,
tDarts Team`,
    htmlContent: `<p>Dear {userName},</p><p>Use this code to reset your password:</p><p style="font-size:24px;font-weight:bold;letter-spacing:0.1em;">{resetCode}</p><p>Best regards,<br/>tDarts Team</p>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'admin_user_notification',
    locale: 'en',
    name: 'Admin to User Notification (EN)',
    description: 'English admin notification email',
    category: 'admin',
    subject: '[tDarts Admin] {customSubject}',
    variables: ['userName', 'customSubject', 'customMessage', 'language'],
    textContent: `Dear {userName},

As a tDarts admin we would like to inform you:
{customSubject}
{customMessage}

Best regards,
tDarts Admin Team`,
    htmlContent: `<p>Dear {userName},</p><p>As a tDarts admin we would like to inform you:</p><h3>{customSubject}</h3><p style="white-space:pre-line;">{customMessage}</p><p>Best regards,<br/>tDarts Admin Team</p>`,
    isActive: true,
    isDefault: true,
  },
  {
    key: 'player_tournament_notification',
    locale: 'en',
    name: 'Player Tournament Notification (EN)',
    description: 'English player tournament notification',
    category: 'tournament',
    subject: '[{tournamentName}] {customSubject}',
    variables: ['tournamentName', 'playerName', 'customSubject', 'customMessage', 'language'],
    textContent: `Dear {playerName},

Regarding the {tournamentName} tournament:
{customSubject}
{customMessage}

Best regards,
tDarts Team`,
    htmlContent: `<p>Dear {playerName},</p><p>Regarding the <strong>{tournamentName}</strong> tournament:</p><h3>{customSubject}</h3><p style="white-space:pre-line;">{customMessage}</p><p>Best regards,<br/>tDarts Team</p>`,
    isActive: true,
    isDefault: true,
  },
];

async function seedEmailTemplates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectMongo();
    
    console.log('🗑️  Clearing existing email templates...');
    await EmailTemplateModel.deleteMany({});
    
    console.log('📧 Seeding email templates...');
    for (const template of [...defaultTemplates, ...englishTemplateVariants]) {
      await EmailTemplateModel.create(template);
      console.log(`  ✅ Created template: ${template.name}`);
    }
    
    console.log(`\n✨ Successfully seeded ${defaultTemplates.length} email templates!`);
    console.log('📝 Templates can now be edited from the admin panel at /admin/emails');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding email templates:', error);
    process.exit(1);
  }
}

seedEmailTemplates();
