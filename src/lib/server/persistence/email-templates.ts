export type EmailRender = {
  subject: string;
  text: string;
  html: string;
};

export function renderQuestionnaireInvitationEmail(vars: {
  firstName: string;
  invitationUrl: string;
}): EmailRender {
  const first = vars.firstName.trim() || "there";
  const subject = "Welcome to Alexander — complete your business setup";
  const text = `Hi ${first},

Welcome to Alexander.

Your subscription has been confirmed. The next step is to tell us how your business handles calls, scheduling, service requests, emergencies, and other day-to-day situations.

We'll use this information to configure Alexander around your business.

Complete My Alexander Setup:
${vars.invitationUrl}

Once your questionnaire is submitted, we'll configure and verify your Alexander phone agent before your dashboard access is activated.

Alexander
A product of Beyond Intelligence, Inc.
`;
  const html = `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#211f1f;line-height:1.5">
<p>Hi ${escapeHtml(first)},</p>
<p>Welcome to Alexander.</p>
<p>Your subscription has been confirmed. The next step is to tell us how your business handles calls, scheduling, service requests, emergencies, and other day-to-day situations.</p>
<p>We'll use this information to configure Alexander around your business.</p>
<p><a href="${escapeAttr(vars.invitationUrl)}" style="display:inline-block;background:#c8ff00;color:#06152b;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Complete My Alexander Setup</a></p>
<p>Once your questionnaire is submitted, we'll configure and verify your Alexander phone agent before your dashboard access is activated.</p>
<p>Alexander<br/>A product of Beyond Intelligence, Inc.</p>
</body></html>`;
  return { subject, text, html };
}

export function renderQuestionnaireInvitationCorrectionEmail(vars: {
  firstName: string;
  invitationUrl: string;
}): EmailRender {
  const first = vars.firstName.trim() || "there";
  const subject = "Your Alexander setup link";
  const text = `Hi ${first},

Your Alexander subscription is confirmed.

Please use the secure link below to complete your business setup questionnaire so we can configure Alexander for your company.

Complete My Alexander Setup:
${vars.invitationUrl}

Once submitted, we'll use your answers to configure and verify your Alexander phone agent.

Alexander
A product of Beyond Intelligence, Inc.
`;
  const html = `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#211f1f;line-height:1.5">
<p>Hi ${escapeHtml(first)},</p>
<p>Your Alexander subscription is confirmed.</p>
<p>Please use the secure link below to complete your business setup questionnaire so we can configure Alexander for your company.</p>
<p><a href="${escapeAttr(vars.invitationUrl)}" style="display:inline-block;background:#c8ff00;color:#06152b;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Complete My Alexander Setup</a></p>
<p>Once submitted, we'll use your answers to configure and verify your Alexander phone agent.</p>
<p>Alexander<br/>A product of Beyond Intelligence, Inc.</p>
</body></html>`;
  return { subject, text, html };
}

export function renderDashboardReadyEmail(vars: {
  firstName: string;
  dashboardUrl: string;
}): EmailRender {
  const first = vars.firstName.trim() || "there";
  const subject = "Your Alexander dashboard is ready";
  const text = `Hi ${first},

Your Alexander setup has been configured and your workspace is ready.

Use the secure link below to access your Alexander dashboard:
${vars.dashboardUrl}

If this is your first time signing in, follow the invitation steps to create your account.

Alexander
A product of Beyond Intelligence, Inc.
`;
  const html = `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#211f1f;line-height:1.5">
<p>Hi ${escapeHtml(first)},</p>
<p>Your Alexander setup has been configured and your workspace is ready.</p>
<p><a href="${escapeAttr(vars.dashboardUrl)}" style="display:inline-block;background:#c8ff00;color:#06152b;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Open My Alexander Dashboard</a></p>
<p>If this is your first time signing in, follow the invitation steps to create your account.</p>
<p>Alexander<br/>A product of Beyond Intelligence, Inc.</p>
</body></html>`;
  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
