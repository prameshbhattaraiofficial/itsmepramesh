import nodemailer from 'nodemailer';
import { db } from './db.ts';

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  eventType: string;
}

export interface SendEmailResult {
  sent: boolean;
  provider: 'smtp' | 'resend' | 'outbox';
  deliveryStatus: 'sent' | 'logged' | 'failed';
  recipientEmail: string;
  logId: number;
  errorMessage?: string | null;
}

function logEmailAttempt(params: {
  recipientEmail: string;
  eventType: string;
  subject: string;
  bodyText: string;
  deliveryStatus: 'sent' | 'logged' | 'failed';
  provider: 'smtp' | 'resend' | 'outbox';
  errorMessage?: string | null;
}): number {
  const info = db
    .prepare(
      `INSERT INTO email_logs (recipient_email, event_type, subject, body_text, delivery_status, provider, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.recipientEmail,
      params.eventType,
      params.subject,
      params.bodyText,
      params.deliveryStatus,
      params.provider,
      params.errorMessage ?? null
    );
  return Number(info.lastInsertRowid);
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = input.to.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport(
        smtpHost
          ? {
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: { user: smtpUser, pass: smtpPass },
            }
          : {
              service: 'gmail',
              auth: { user: smtpUser, pass: smtpPass },
            }
      );

      const fromAddress = process.env.SMTP_FROM?.trim() || `Pramesh Bhattarai Store <${smtpUser}>`;
      await transporter.sendMail({
        from: fromAddress,
        to,
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      const logId = logEmailAttempt({
        recipientEmail: to,
        eventType: input.eventType,
        subject: input.subject,
        bodyText: input.text,
        deliveryStatus: 'sent',
        provider: 'smtp',
      });
      return { sent: true, provider: 'smtp', deliveryStatus: 'sent', recipientEmail: to, logId };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'SMTP delivery failed';
      console.error('SMTP email send failed:', errMsg);
      const logId = logEmailAttempt({
        recipientEmail: to,
        eventType: input.eventType,
        subject: input.subject,
        bodyText: input.text,
        deliveryStatus: 'failed',
        provider: 'smtp',
        errorMessage: errMsg,
      });
      return {
        sent: false,
        provider: 'smtp',
        deliveryStatus: 'failed',
        recipientEmail: to,
        logId,
        errorMessage: errMsg,
      };
    }
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'Store Notifications <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          reply_to: input.replyTo,
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      });
      if (res.ok) {
        const logId = logEmailAttempt({
          recipientEmail: to,
          eventType: input.eventType,
          subject: input.subject,
          bodyText: input.text,
          deliveryStatus: 'sent',
          provider: 'resend',
        });
        return { sent: true, provider: 'resend', deliveryStatus: 'sent', recipientEmail: to, logId };
      }
      const errText = await res.text();
      console.error('Resend email failed:', res.status, errText);
      const logId = logEmailAttempt({
        recipientEmail: to,
        eventType: input.eventType,
        subject: input.subject,
        bodyText: input.text,
        deliveryStatus: 'failed',
        provider: 'resend',
        errorMessage: errText,
      });
      return {
        sent: false,
        provider: 'resend',
        deliveryStatus: 'failed',
        recipientEmail: to,
        logId,
        errorMessage: errText,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Resend delivery failed';
      console.error('Resend email exception:', errMsg);
      const logId = logEmailAttempt({
        recipientEmail: to,
        eventType: input.eventType,
        subject: input.subject,
        bodyText: input.text,
        deliveryStatus: 'failed',
        provider: 'resend',
        errorMessage: errMsg,
      });
      return {
        sent: false,
        provider: 'resend',
        deliveryStatus: 'failed',
        recipientEmail: to,
        logId,
        errorMessage: errMsg,
      };
    }
  }

  // No external SMTP/Resend credentials configured — persist in transactional email outbox
  const logId = logEmailAttempt({
    recipientEmail: to,
    eventType: input.eventType,
    subject: input.subject,
    bodyText: input.text,
    deliveryStatus: 'logged',
    provider: 'outbox',
  });
  return { sent: false, provider: 'outbox', deliveryStatus: 'logged', recipientEmail: to, logId };
}
