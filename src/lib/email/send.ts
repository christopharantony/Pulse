import 'server-only';
import { resend } from '@/lib/email/client';
import { serverEnv } from '@/lib/env.server';

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

// Best-effort: logs failures instead of throwing, so an email-provider outage never turns into a
// hard failure for register/forgot-password/etc — the caller has already done its DB work.
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  try {
    const { error } = await resend.emails.send({
      from: serverEnv.EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (error) {
      console.error('Failed to send email:', error);
    }
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}
