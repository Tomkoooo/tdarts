import nodemailer from 'nodemailer';
import { createEmailResendToken } from '@/lib/email-resend';
import { EmailLocale, normalizeEmailLocale } from '@/lib/email-layout';

interface MailOptions {
   from?: string
    to: Array<string>;
    subject: string;
    text: string;
    html?: string;
    resendContext?: {
        templateKey: string;
        variables: Record<string, any>;
        locale?: EmailLocale | string | null;
    };
    attachments?: Array<{
        filename: string;
        content: any;
        contentType?: string;
    }>;
}


let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'smtp',
      host: process.env.EMAIL_HOST!,
      port: parseInt(process.env.EMAIL_PORT!) || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      }
    });
  }
  return transporter;
}


export async function sendEmail(MailOptions: MailOptions) {
    let htmlBody = MailOptions.html;
    let textBody = MailOptions.text;

    if (MailOptions.resendContext && MailOptions.to?.[0]) {
      try {
        const resendToken = createEmailResendToken({
          to: MailOptions.to[0],
          templateKey: MailOptions.resendContext.templateKey,
          variables: MailOptions.resendContext.variables,
          locale: normalizeEmailLocale(MailOptions.resendContext.locale),
        });
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.sironic.hu';
        const resendUrl = `${baseUrl}/email/resend?token=${encodeURIComponent(resendToken)}`;

        const footerText = `\n\nNeed this email in another language? Request it again here: ${resendUrl}`;
        textBody = `${MailOptions.text || ''}${footerText}`;

        const footerHtml = `<p style="margin-top:20px;font-size:12px;color:#6b7280;">Need this email in another language? <a href="${resendUrl}" target="_blank" style="color:#991b1b;">Request it again here</a>.</p>`;

        if (htmlBody && /<\/body>/i.test(htmlBody)) {
          htmlBody = htmlBody.replace(/<\/body>/i, `${footerHtml}</body>`);
        } else if (htmlBody) {
          htmlBody = `${htmlBody}${footerHtml}`;
        }
      } catch (error) {
        console.error('Failed to append resend link to email:', error);
      }
    }

    // send mail with defined transport object
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: MailOptions.from ? MailOptions.from : `tDarts - Értesítés <${process.env.EMAIL_USER!}>`, // sender address
      to: MailOptions.to, // list of receivers
      subject: MailOptions.subject, // Subject line
      text: textBody, // plain text body
      html: htmlBody, // html body
      attachments: MailOptions.attachments, // attachments
    });
  
    if (!info.messageId) {
      return false;
    }  
    return true;
    // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
  }