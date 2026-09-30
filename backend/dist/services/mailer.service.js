import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
export class MailerService {
    transporter = null;
    constructor() {
        this.initTransporter();
    }
    initTransporter() {
        if (env.EMAIL_PROVIDER === 'mailpit' || env.EMAIL_PROVIDER === 'smtp') {
            try {
                this.transporter = nodemailer.createTransport({
                    host: env.SMTP_HOST,
                    port: env.SMTP_PORT,
                    secure: env.SMTP_SECURE,
                    ignoreTLS: env.SMTP_PORT === 1025 || !env.SMTP_SECURE,
                    auth: env.SMTP_USER && env.SMTP_PASS ? {
                        user: env.SMTP_USER,
                        pass: env.SMTP_PASS
                    } : undefined,
                    tls: {
                        rejectUnauthorized: env.NODE_ENV === 'production'
                    }
                });
            }
            catch (err) {
                logger.warn({ err }, 'Failed to initialize SMTP transporter; fallback to console logging.');
                this.transporter = null;
            }
        }
    }
    async sendMail(options) {
        const { to, subject, text, html } = options;
        logger.info({ to, subject }, 'Dispatching transactional email');
        // 1. Resend API
        if (env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY) {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: env.EMAIL_FROM,
                        to: [to],
                        subject,
                        text,
                        html
                    })
                });
                if (!response.ok) {
                    const errText = await response.text();
                    logger.error({ status: response.status, errText }, 'Resend API returned error');
                    return false;
                }
                logger.info({ to }, 'Email delivered via Resend API');
                return true;
            }
            catch (err) {
                logger.error({ err }, 'Failed to send email via Resend API');
                return false;
            }
        }
        // 2. SendGrid API
        if (env.EMAIL_PROVIDER === 'sendgrid' && env.SENDGRID_API_KEY) {
            try {
                const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        personalizations: [{ to: [{ email: to }] }],
                        from: { email: env.EMAIL_FROM.includes('<') ? (env.EMAIL_FROM.split('<')[1]?.replace('>', '').trim() || env.EMAIL_FROM) : env.EMAIL_FROM },
                        subject,
                        content: [
                            { type: 'text/plain', value: text },
                            { type: 'text/html', value: html }
                        ]
                    })
                });
                if (!response.ok) {
                    const errText = await response.text();
                    logger.error({ status: response.status, errText }, 'SendGrid API returned error');
                    return false;
                }
                logger.info({ to }, 'Email delivered via SendGrid API');
                return true;
            }
            catch (err) {
                logger.error({ err }, 'Failed to send email via SendGrid API');
                return false;
            }
        }
        // 3. Mailpit / SMTP
        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: env.EMAIL_FROM,
                    to,
                    subject,
                    text,
                    html
                });
                logger.info({ to, host: env.SMTP_HOST, port: env.SMTP_PORT }, 'Email delivered via SMTP/Mailpit');
                return true;
            }
            catch (err) {
                logger.warn({ err }, 'SMTP delivery failed; logging email content to console.');
            }
        }
        // 4. Console Fallback
        logger.info({
            to,
            subject,
            previewText: text.slice(0, 200)
        }, '📧 [MAILER LOG] Transactional email sent (view in Mailpit at http://localhost:8025)');
        return true;
    }
    async sendVerificationEmail(toEmail, name, token) {
        const verificationUrl = `${env.APP_URL}/verify-email?token=${token}`;
        const subject = 'Verify your email for BranchPruner';
        const text = `Hi ${name},\n\nPlease verify your email address to activate your BranchPruner account by visiting:\n${verificationUrl}\n\nThis verification link will expire in 24 hours.\n\nBest regards,\nThe BranchPruner Security Team`;
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #FAF9F5; padding: 32px 24px; border-radius: 16px; border: 1px solid #E5E5E0;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 20px; font-weight: 800; color: #3B4415; letter-spacing: -0.5px;">BranchPruner</span>
          <span style="display: block; font-size: 11px; font-family: monospace; color: #78716C; text-transform: uppercase;">Automated Git Hygiene</span>
        </div>
        <div style="background-color: #FFFFFF; padding: 28px; border-radius: 12px; border: 1px solid #E7E5E4; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <h2 style="font-size: 18px; font-weight: 700; color: #1C1917; margin-top: 0; margin-bottom: 12px;">Confirm your email address</h2>
          <p style="font-size: 14px; color: #44403C; line-height: 1.6; margin-bottom: 20px;">
            Hi ${name}, thank you for signing up for BranchPruner. To activate your automated git hygiene controller and protect your remote branches, please verify your email address.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verificationUrl}" style="background-color: #6B7A2A; color: #FFFFFF; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px; display: inline-block; box-shadow: 0 2px 6px rgba(107,122,42,0.3);">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 12px; color: #78716C; line-height: 1.5; margin-top: 24px; border-top: 1px solid #F5F5F4; pt: 16px;">
            Or copy and paste this verification URL into your browser:<br/>
            <a href="${verificationUrl}" style="color: #6B7A2A; word-break: break-all;">${verificationUrl}</a>
          </p>
          <p style="font-size: 11px; color: #A8A29E; margin-top: 16px;">
            This link expires in 24 hours. If you did not create this account, no action is required.
          </p>
        </div>
      </div>
    `;
        return this.sendMail({ to: toEmail, subject, text, html });
    }
    async sendPasswordResetEmail(toEmail, name, token) {
        const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
        const subject = 'Reset your BranchPruner password';
        const text = `Hi ${name},\n\nWe received a request to reset your BranchPruner password. You can set a new password by visiting:\n${resetUrl}\n\nThis single-use link will expire in 1 hour.\n\nIf you did not request a password reset, you can safely ignore this email.\n\nBest regards,\nThe BranchPruner Security Team`;
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #FAF9F5; padding: 32px 24px; border-radius: 16px; border: 1px solid #E5E5E0;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 20px; font-weight: 800; color: #3B4415; letter-spacing: -0.5px;">BranchPruner</span>
          <span style="display: block; font-size: 11px; font-family: monospace; color: #78716C; text-transform: uppercase;">Automated Git Hygiene</span>
        </div>
        <div style="background-color: #FFFFFF; padding: 28px; border-radius: 12px; border: 1px solid #E7E5E4; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <h2 style="font-size: 18px; font-weight: 700; color: #1C1917; margin-top: 0; margin-bottom: 12px;">Reset your password</h2>
          <p style="font-size: 14px; color: #44403C; line-height: 1.6; margin-bottom: 20px;">
            Hi ${name}, we received a request to reset your BranchPruner account password. Click below to securely choose a new password:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background-color: #6B7A2A; color: #FFFFFF; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px; display: inline-block; box-shadow: 0 2px 6px rgba(107,122,42,0.3);">
              Reset Password
            </a>
          </div>
          <p style="font-size: 12px; color: #78716C; line-height: 1.5; margin-top: 24px; border-top: 1px solid #F5F5F4; pt: 16px;">
            Or copy and paste this URL into your browser:<br/>
            <a href="${resetUrl}" style="color: #6B7A2A; word-break: break-all;">${resetUrl}</a>
          </p>
          <p style="font-size: 11px; color: #A8A29E; margin-top: 16px;">
            This single-use link will expire in 1 hour. If you did not request this change, your account remains secure and you can disregard this message.
          </p>
        </div>
      </div>
    `;
        return this.sendMail({ to: toEmail, subject, text, html });
    }
}
export const mailerService = new MailerService();
