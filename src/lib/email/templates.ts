export interface EmailContent {
  subject: string;
  html: string;
}

function layout(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0f172a;">
      <p style="font-size: 18px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 24px;">Pulse</p>
      ${bodyHtml}
      <p style="font-size: 13px; color: #64748b; margin-top: 32px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

export function verificationEmail(link: string): EmailContent {
  return {
    subject: 'Verify your email address',
    html: layout(`
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        Confirm your email address to finish setting up your Pulse account.
      </p>
      <a href="${link}" style="display: inline-block; background: #06b6d4; color: #020617; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 10px; text-decoration: none;">
        Verify email
      </a>
      <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
        This link expires in 24 hours.
      </p>
    `),
  };
}

export function passwordResetEmail(link: string): EmailContent {
  return {
    subject: 'Reset your password',
    html: layout(`
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        We received a request to reset your Pulse password. Click below to choose a new one.
      </p>
      <a href="${link}" style="display: inline-block; background: #06b6d4; color: #020617; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 10px; text-decoration: none;">
        Reset password
      </a>
      <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
        This link expires in 1 hour.
      </p>
    `),
  };
}

export function passwordChangedEmail(): EmailContent {
  return {
    subject: 'Your password was changed',
    html: layout(`
      <p style="font-size: 15px; line-height: 1.6; margin: 0;">
        Your Pulse account password was just changed. All other devices have been signed out.
      </p>
    `),
  };
}
