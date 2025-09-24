import nodemailer from 'nodemailer';

interface MailOptions {
   from?: string
    to: Array<string>;
    subject: string;
    text: string;
    html?: string;
}


const transporter = nodemailer.createTransport({
  service: 'smtp',
host: process.env.EMAIL_HOST!,
port: parseInt(process.env.EMAIL_PORT!) || 465,
secure: true,
auth: {
  user: process.env.EMAIL_USER!,
  pass: process.env.EMAIL_PASS!,
}
});


export async function sendEmail(MailOptions: MailOptions) {
    // send mail with defined transport object
    const info = await transporter.sendMail({
      from: MailOptions.from ? MailOptions.from : `tDarts Értesítés <${process.env.EMAIL_USER!}>`, // sender address
      to: MailOptions.to, // list of receivers
      subject: MailOptions.subject, // Subject line
      text: MailOptions.text, // plain text body
      html: MailOptions.html, // html body
    });
  
    if (!info.messageId) {
      return false;
    }  
    return true;
    // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
  }