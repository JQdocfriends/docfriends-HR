import { getResend } from "./resend";
import { buildInvitationEmail } from "./templates/invitation";

interface SendInvitationParams {
  to: string;
  token: string;
  invitedByName: string;
  companyName: string;
}

export async function sendInvitationEmail(
  params: SendInvitationParams
): Promise<{ success: boolean; error?: string }> {
  const { to, token, invitedByName, companyName } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const joinUrl = `${appUrl}/join?token=${token}`;

  const { subject, html } = buildInvitationEmail({
    invitedByName,
    companyName,
    joinUrl,
    expiresInDays: 7,
  });

  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com";

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: `타운 <${fromEmail}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to send invitation email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "이메일 발송에 실패했습니다",
    };
  }
}
