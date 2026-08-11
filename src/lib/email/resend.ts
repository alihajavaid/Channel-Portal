import "server-only";
import { Resend } from "resend";
import type { ReactNode } from "react";

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("RESEND_API_KEY is not configured — email cannot be sent");
  }
}

export class EmailSendError extends Error {}

// The entire point of this rebuild is "credentials must actually be emailed" — so a missing
// key throws loudly here rather than silently no-op'ing and recreating the original bug.
export async function sendEmail(input: { to: string; subject: string; react: ReactNode }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailNotConfiguredError();
  }
  const from = process.env.EMAIL_FROM ?? "Channel Portal <onboarding@resend.dev>";
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    react: input.react,
  });
  if (error) {
    throw new EmailSendError(error.message);
  }
}
