/**
 * Reusable HTML email templates — one shared layout, plus a content function per event type.
 * Every function returns { subject, html, text }: the text version is never an afterthought
 * (accessibility, spam-score, and it's what ConsoleEmailService's dev fallback displays), so it's
 * written by hand alongside the HTML rather than derived from it.
 *
 * Inline CSS throughout — email clients strip <style> blocks unpredictably, so nothing here
 * relies on one. Kept deliberately simple (a header bar, a body, an optional CTA button, a
 * footer) rather than a heavy framework grid, since that's what actually renders consistently
 * across Gmail/Outlook/Apple Mail.
 */

const DEFAULT_BRAND_COLOR = '#0f172a';

interface LayoutInput {
  previewText: string;
  heading: string;
  bodyHtml: string;
  ctaText?: string;
  ctaLink?: string;
  brandColor?: string;
  tenantName?: string;
}

function renderLayout({ previewText, heading, bodyHtml, ctaText, ctaLink, brandColor = DEFAULT_BRAND_COLOR, tenantName }: LayoutInput): string {
  const cta =
    ctaText && ctaLink
      ? `<tr><td style="padding:24px 32px 8px;"><a href="${ctaLink}" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;">${ctaText}</a></td></tr>
         <tr><td style="padding:0 32px 24px;"><p style="margin:0;font-size:13px;color:#64748b;word-break:break-all;">Or copy this link: <a href="${ctaLink}" style="color:${brandColor};">${ctaLink}</a></p></td></tr>`
      : '';

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;font-size:1px;color:#f1f5f9;">${previewText}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:${brandColor};padding:20px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">${tenantName ?? 'Grow More'}</span>
        </td></tr>
        <tr><td style="padding:32px 32px 8px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${heading}</h1>
          <div style="font-size:15px;line-height:1.6;color:#334155;">${bodyHtml}</div>
        </td></tr>
        ${cta}
        <tr><td style="padding:24px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated message — please don't reply directly to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function inviteEmailTemplate(input: { tenantName: string; role: string; inviteLink: string; expiresInDays: number }): RenderedEmail {
  const subject = `You've been invited to join ${input.tenantName}`;
  return {
    subject,
    html: renderLayout({
      previewText: subject,
      heading: `Join ${input.tenantName} on Grow More`,
      bodyHtml: `<p>You've been invited to join <strong>${input.tenantName}</strong> as <strong>${input.role.replace(/_/g, ' ')}</strong>.</p>
        <p>Click below to set your password and activate your account. This link expires in ${input.expiresInDays} days.</p>`,
      ctaText: 'Accept invitation',
      ctaLink: input.inviteLink,
      tenantName: input.tenantName,
    }),
    text: `You've been invited to join ${input.tenantName} as ${input.role.replace(/_/g, ' ')}.\n\nAccept your invitation and set your password:\n${input.inviteLink}\n\nThis link expires in ${input.expiresInDays} days.`,
  };
}

export function companyAdminInviteTemplate(input: { tenantName: string; inviteLink: string; expiresInDays: number }): RenderedEmail {
  const subject = `You've been made administrator of ${input.tenantName}`;
  return {
    subject,
    html: renderLayout({
      previewText: subject,
      heading: `Welcome, ${input.tenantName} administrator`,
      bodyHtml: `<p>A workspace called <strong>${input.tenantName}</strong> has been created for your organization, and you've been made its administrator.</p>
        <p>Click below to set your password and activate your account. From there you can invite your team, set up departments and branches, and configure your company. This link expires in ${input.expiresInDays} days.</p>`,
      ctaText: 'Activate your account',
      ctaLink: input.inviteLink,
      tenantName: input.tenantName,
    }),
    text: `A workspace called ${input.tenantName} has been created for your organization, and you've been made its administrator.\n\nActivate your account and set your password:\n${input.inviteLink}\n\nThis link expires in ${input.expiresInDays} days.`,
  };
}

export function passwordResetEmailTemplate(input: { resetLink: string; validForMinutes: number }): RenderedEmail {
  const subject = 'Reset your Grow More password';
  return {
    subject,
    html: renderLayout({
      previewText: subject,
      heading: 'Reset your password',
      bodyHtml: `<p>We received a request to reset your password. If this wasn't you, you can safely ignore this email.</p>
        <p>This link is valid for ${input.validForMinutes} minutes.</p>`,
      ctaText: 'Reset password',
      ctaLink: input.resetLink,
    }),
    text: `Reset your password by visiting this link (valid for ${input.validForMinutes} minutes):\n${input.resetLink}\n\nIf you didn't request this, you can ignore this email.`,
  };
}

export function welcomeEmailTemplate(input: { firstName: string; tenantName: string; loginLink: string }): RenderedEmail {
  const subject = `Welcome to ${input.tenantName}!`;
  return {
    subject,
    html: renderLayout({
      previewText: subject,
      heading: `Welcome aboard, ${input.firstName}!`,
      bodyHtml: `<p>Your account is now active. You can log in any time to view your dashboard, punch in/out, apply for leave, and more.</p>`,
      ctaText: 'Go to login',
      ctaLink: input.loginLink,
      tenantName: input.tenantName,
    }),
    text: `Welcome aboard, ${input.firstName}!\n\nYour account is now active. Log in here:\n${input.loginLink}`,
  };
}

export function interviewScheduledEmailTemplate(input: {
  candidateName: string;
  jobTitle: string;
  tenantName: string;
  scheduledAt: Date;
  mode: string;
  location?: string;
}): RenderedEmail {
  const when = input.scheduledAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
  const subject = `Interview scheduled — ${input.jobTitle} at ${input.tenantName}`;
  const modeLine = input.location ? `${input.mode} — ${input.location}` : input.mode;
  return {
    subject,
    html: renderLayout({
      previewText: subject,
      heading: `Your interview is scheduled`,
      bodyHtml: `<p>Hi ${input.candidateName},</p>
        <p>Your interview for <strong>${input.jobTitle}</strong> at <strong>${input.tenantName}</strong> has been scheduled.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#64748b;">When</td><td style="font-weight:600;">${when}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Format</td><td style="font-weight:600;">${modeLine}</td></tr>
        </table>
        <p>We look forward to speaking with you.</p>`,
      tenantName: input.tenantName,
    }),
    text: `Hi ${input.candidateName},\n\nYour interview for ${input.jobTitle} at ${input.tenantName} has been scheduled.\n\nWhen: ${when}\nFormat: ${modeLine}\n\nWe look forward to speaking with you.`,
  };
}

/**
 * Generic wrapper used for every notification routed through NotificationService.notify() —
 * title/body/link there are already meaningful human-readable text (see the existing call sites
 * in leave/task/ticket services), so a bespoke template per NotificationType would just repeat
 * the same content in a different font. One reusable template, real per-notification content.
 */
export function notificationEmailTemplate(input: { title: string; body: string; link?: string; appUrl: string; tenantName?: string }): RenderedEmail {
  const fullLink = input.link ? `${input.appUrl}${input.link}` : undefined;
  return {
    subject: input.title,
    html: renderLayout({
      previewText: input.body,
      heading: input.title,
      bodyHtml: `<p>${input.body}</p>`,
      ctaText: fullLink ? 'View details' : undefined,
      ctaLink: fullLink,
      tenantName: input.tenantName,
    }),
    text: fullLink ? `${input.title}\n\n${input.body}\n\n${fullLink}` : `${input.title}\n\n${input.body}`,
  };
}
