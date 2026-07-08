import { Resend } from 'resend';
import { EmailError } from './errors.js';

/**
 * Transactional email (password reset, email verification) via Resend — the
 * second and only other external dependency alongside OpenAI. Lazily
 * constructed, same pattern as the Whisper client in whisper.ts, so importing
 * this module never requires the key to be present (e.g. during `next build`).
 */

let client: Resend | undefined;

function getClient(): Resend {
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

function fromAddress(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new EmailError('EMAIL_FROM is not set.');
  return from;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const { error } = await getClient().emails.send({ from: fromAddress(), to, subject, html });
  if (error) throw new EmailError(`Resend API error: ${error.message}`);
}

/** Send a password-reset email containing a one-time link. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await send(
    to,
    'Reset your password',
    `<p>We received a request to reset your Audio→Text password.</p>
<p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>`,
  );
}

/** Send an email-verification email containing a one-time confirmation link. */
export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  await send(
    to,
    'Confirm your email address',
    `<p>Please confirm this is your email address for Audio→Text.</p>
<p><a href="${verifyUrl}">Click here to confirm your email</a>. This link expires in 24 hours.</p>
<p>If you didn't create this account, you can safely ignore this email.</p>`,
  );
}
