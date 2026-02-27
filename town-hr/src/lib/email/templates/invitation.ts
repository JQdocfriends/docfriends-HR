interface InvitationEmailParams {
  invitedByName: string;
  companyName: string;
  joinUrl: string;
  expiresInDays: number;
}

export function buildInvitationEmail(params: InvitationEmailParams): {
  subject: string;
  html: string;
} {
  const { invitedByName, companyName, joinUrl, expiresInDays } = params;

  const subject = `[타운] ${companyName}에서 초대가 도착했습니다`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #E5E5E5;">
    <tr>
      <td style="padding:40px 32px;text-align:center;">
        <!-- Logo -->
        <div style="display:inline-block;width:48px;height:48px;line-height:48px;background-color:#18181B;color:#FAFAFA;font-size:24px;font-weight:700;border-radius:12px;margin-bottom:24px;">T</div>

        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181B;">구성원 초대</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#737373;">
          ${invitedByName}님이 <strong>${companyName}</strong>의 구성원으로 초대했습니다.
        </p>

        <!-- CTA Button -->
        <a href="${joinUrl}" style="display:inline-block;padding:12px 32px;background-color:#18181B;color:#FAFAFA;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          초대 수락하기
        </a>

        <p style="margin:24px 0 0;font-size:12px;color:#A3A3A3;">
          이 초대는 ${expiresInDays}일 후 만료됩니다.<br/>
          초대를 요청하지 않았다면 이 이메일을 무시해주세요.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { subject, html };
}
