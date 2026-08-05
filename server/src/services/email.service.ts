import nodemailer from 'nodemailer';
import { env } from '../config/env';

const createTransporter = () => {
  if (env.SMTP_EMAIL.includes('example') || env.SMTP_PASSWORD.includes('your')) {
    return null;
  }
  try {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.SMTP_EMAIL,
        pass: env.SMTP_PASSWORD,
      },
    });
  } catch {
    return null;
  }
};

const transporter = createTransporter();

export const emailService = {
  async sendVerificationCode(email: string, code: string): Promise<void> {
    console.log(`\n========================================`);
    console.log(`🔑 VERIFICATION CODE FOR ${email}: ${code}`);
    console.log(`========================================\n`);

    if (!transporter) {
      console.log(`[EmailService] SMTP not configured. OTP printed to console above.`);
      return;
    }

    try {
      await transporter.sendMail({
        from: `"Realtime Board Manager" <${env.SMTP_EMAIL}>`,
        to: email,
        subject: 'Your Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F8FAFC; border-radius: 12px;">
            <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 8px;">Realtime Board Manager</h1>
            <p style="color: #0F172A; font-size: 16px;">Your verification code is:</p>
            <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="color: #FFFFFF; font-size: 40px; font-weight: 800; letter-spacing: 8px;">${code}</span>
            </div>
            <p style="color: #64748B; font-size: 14px;">This code expires in 10 minutes.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error(`[EmailService] Failed to send email via SMTP, fallback to console OTP:`, err);
    }
  },

  async sendInvitationEmail(
    to: string,
    boardName: string,
    inviterName: string
  ): Promise<void> {
    console.log(`[EmailService] Invitation sent to ${to} for board "${boardName}" by ${inviterName}`);

    if (!transporter) return;

    try {
      await transporter.sendMail({
        from: `"Realtime Board Manager" <${env.SMTP_EMAIL}>`,
        to,
        subject: `You've been invited to join "${boardName}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F8FAFC; border-radius: 12px;">
            <h1 style="color: #4F46E5; font-size: 24px;">Board Invitation</h1>
            <p style="color: #0F172A; font-size: 16px;">
              <strong>${inviterName}</strong> has invited you to collaborate on <strong>"${boardName}"</strong>.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error(`[EmailService] Failed to send invitation email:`, err);
    }
  },
};
