import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.SMTP_EMAIL,
    pass: env.SMTP_PASSWORD,
  },
});

export const emailService = {
  async sendVerificationCode(email: string, code: string): Promise<void> {
    await transporter.sendMail({
      from: `"Realtime Board Manager" <${env.SMTP_EMAIL}>`,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F8FAFC; border-radius: 12px;">
          <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 8px;">Realtime Board Manager</h1>
          <p style="color: #0F172A; font-size: 16px;">Your verification code is:</p>
          <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="color: #FFFFFF; font-size: 40px; font-weight: 800; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="color: #64748B; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `,
    });
  },

  async sendInvitationEmail(
    to: string,
    boardName: string,
    inviterName: string
  ): Promise<void> {
    await transporter.sendMail({
      from: `"Realtime Board Manager" <${env.SMTP_EMAIL}>`,
      to,
      subject: `You've been invited to join "${boardName}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F8FAFC; border-radius: 12px;">
          <h1 style="color: #4F46E5; font-size: 24px;">Board Invitation</h1>
          <p style="color: #0F172A; font-size: 16px;">
            <strong>${inviterName}</strong> has invited you to collaborate on the board <strong>"${boardName}"</strong>.
          </p>
          <p style="color: #64748B; font-size: 14px;">Sign in to Realtime Board Manager to accept or decline the invitation.</p>
        </div>
      `,
    });
  },
};
