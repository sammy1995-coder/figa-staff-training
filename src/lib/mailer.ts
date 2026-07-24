import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true' || SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return cachedTransporter;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('Email delivery is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD).');
    this.name = 'EmailNotConfiguredError';
  }
}

export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    throw new EmailNotConfiguredError();
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER!;

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: 'Your staff training portal password reset code',
    text:
      `Your password reset code is: ${otpCode}\n\n` +
      `This code expires in 15 minutes. If you did not request this, you can ignore this email.`,
    html:
      `<p>Your password reset code is:</p>` +
      `<p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${otpCode}</p>` +
      `<p>This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}
