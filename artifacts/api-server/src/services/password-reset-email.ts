import { logger } from "../lib/logger";

type SendPasswordResetEmailInput = {
  to: string;
  userName: string;
  resetUrl: string;
  ttlMinutes: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPasswordResetHtml(input: SendPasswordResetEmailInput) {
  const safeName = escapeHtml(input.userName || "usuario");
  const safeUrl = escapeHtml(input.resetUrl);
  const ttl = input.ttlMinutes;

  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">GTF Propostas</h1>
      <p>Olá, ${safeName}.</p>
      <p>Recebemos uma solicitação para redefinir a senha do seu acesso ao Sistema Comercial GTF.</p>
      <p>
        <a href="${safeUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
          Redefinir senha
        </a>
      </p>
      <p>Este link expira em ${ttl} minutos e pode ser usado apenas uma vez.</p>
      <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
      <p style="font-size: 12px; color: #666;">Link alternativo: ${safeUrl}</p>
    </div>
  `;
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput) {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"] || "GTF Propostas <onboarding@resend.dev>";
  const provider = process.env["EMAIL_PROVIDER"] || (apiKey ? "resend" : "mock");

  if (provider === "mock") {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("EMAIL_PROVIDER=mock is not allowed in production");
    }
    logger.info({ to: input.to }, "Password reset email mocked");
    return;
  }

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send password reset email");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Redefinição de senha - GTF Propostas",
      html: buildPasswordResetHtml(input),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    logger.error({ status: response.status, error: payload?.message ?? payload?.error }, "Resend password reset email failed");
    throw new Error("Failed to send password reset email");
  }
}
