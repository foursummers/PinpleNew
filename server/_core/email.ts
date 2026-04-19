/**
 * 邮件发送工具：优先走 Resend HTTP API（无需引入 SDK）。
 *
 * 若未设置 RESEND_API_KEY，则降级为仅打印到日志（不会抛错），
 * 并把"重置链接"以 resetUrl 形式返回给前端，便于早期调试 / 未配置邮件服务时仍能使用。
 */

type SendResult = {
  sent: boolean;
  reason?: string;
  providerId?: string;
};

export function hasEmailProvider(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Pinple <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("[email] RESEND_API_KEY 未配置，跳过实际发送。");
    console.log("[email] → to:", params.to, "| subject:", params.subject);
    return { sent: false, reason: "no-provider" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error("[email] Resend 发送失败:", resp.status, body);
      return { sent: false, reason: `resend-${resp.status}` };
    }
    const data = (await resp.json()) as { id?: string };
    return { sent: true, providerId: data?.id };
  } catch (err) {
    console.error("[email] 发送异常:", err);
    return { sent: false, reason: "exception" };
  }
}

export function buildPasswordResetEmail(params: {
  name: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const { name, resetUrl, expiresMinutes } = params;
  const subject = "【拼朋友 Pinple】重置你的登录密码";
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Space Grotesk','PingFang SC',sans-serif;background:#030407;color:#fff;padding:40px 0;">
      <div style="max-width:520px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:36px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.18em;color:rgba(255,255,255,0.55);background:rgba(255,255,255,0.08);padding:4px 12px;border-radius:999px;display:inline-block;text-transform:uppercase;">PINPLE.IDENTITY</div>
        <h1 style="margin:18px 0 10px;font-size:24px;font-weight:500;">你好 ${escapeHtml(name) || "朋友"}，</h1>
        <p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.6;margin:0 0 24px;">
          我们收到了你重置"拼朋友"账号密码的请求。点击下方按钮即可设置新密码，链接将在 <b>${expiresMinutes} 分钟</b> 内有效。
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#fff;color:#030407;font-weight:600;padding:14px 28px;border-radius:999px;text-decoration:none;letter-spacing:0.04em;">重置密码 →</a>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:28px 0 0;line-height:1.6;">
          如果按钮无法点击，请复制以下链接到浏览器：<br/>
          <span style="color:rgba(255,255,255,0.7);word-break:break-all;">${resetUrl}</span>
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:28px 0;" />
        <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0;">如果不是你本人发起，忽略此邮件即可，账号安全不会受到影响。</p>
      </div>
    </div>
  `;
  const text = `你好 ${name || "朋友"}，

我们收到了你重置"拼朋友"账号密码的请求。请在 ${expiresMinutes} 分钟内打开以下链接重置密码：

${resetUrl}

如果不是你本人发起，请忽略此邮件。`;
  return { subject, html, text };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
