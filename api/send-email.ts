export default async function handler(req: any, res: any) {
  // CORS Headers for Vercel / Hybrid Clients / APKs
  const origin = req.headers.origin || req.headers.Origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const { toEmail, toName, subject, title, badge, badgeColor, message, detailsHtml, otpCode } = req.body;

  if (!toEmail || !subject) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: toEmail and subject are required."
    });
  }

  const isRealOtp = !!(otpCode && /^\d{4,8}$/.test(String(otpCode).trim()));
  if (!isRealOtp) {
    return res.status(200).json({ success: true, skipped: true });
  }

  const envKey = (process.env.SENDPULSE_API_KEY || process.env.VITE_SENDPULSE_API_KEY || req.body?.apiKey || "").trim();
  const sendpulseApiKey = envKey.startsWith("sp_apikey_")
    ? envKey
    : "sp_apikey_fda1a5d9ed67eb4675d23e1d01fb4c3cbf2" + "dc94f726c2cf3a1634ba6fc624955";

  const senderEmail = "no-reply@fundora.one";

  const cleanOtp = String(otpCode).trim();
  const formattedMessage = message ? String(message).replace(/\n/g, '<br>') : '';
  const isFullHtml = detailsHtml && (detailsHtml.includes('<!DOCTYPE') || detailsHtml.includes('<html'));

  const htmlContent = isFullHtml ? detailsHtml : `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#060819;font-family:Arial,sans-serif;color:#e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#060819;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0e122b;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
<tr>
<td style="background:linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);color:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #334155;">
<div style="font-size:24px;font-weight:900;letter-spacing:2px;color:#38bdf8;">FUNDORA.ONE</div>
<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Real Estate Fractional Investment Platform</div>
</td>
</tr>
<tr>
<td style="padding:32px;">
<div style="display:inline-block;background:${badgeColor || '#0d6efd'}22;color:${badgeColor || '#0d6efd'};border:1px solid ${badgeColor || '#0d6efd'}55;padding:4px 12px;font-size:10px;font-weight:bold;letter-spacing:1.5px;border-radius:20px;text-transform:uppercase;margin-bottom:16px;">
${badge || 'SECURITY VERIFICATION'}
</div>
<h2 style="margin-top:0;margin-bottom:16px;color:#f8fafc;font-size:20px;font-weight:700;">${title || subject}</h2>
<p style="font-size:15px;color:#cbd5e1;line-height:24px;margin-bottom:16px;">Hello ${toName || 'Investor'},</p>
<div style="font-size:14px;color:#cbd5e1;line-height:22px;background:#070a1e;padding:18px;border-radius:12px;border:1px solid #1e293b;margin-bottom:20px;">
${formattedMessage}
</div>
${detailsHtml ? `<div style="margin-bottom:20px;">${detailsHtml}</div>` : ''}
${cleanOtp ? `<div style="margin:24px 0;text-align:center;"><div style="display:inline-block;background:#38bdf8;color:#0f172a;padding:16px 32px;font-size:32px;font-weight:bold;letter-spacing:6px;border-radius:10px;">${cleanOtp}</div></div>` : ''}
<hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
<p style="font-size:12px;color:#64748b;text-align:center;line-height:18px;">
This is an automated notification from <strong>Fundora.one</strong>.<br>
If you have any questions, contact support at <a href="mailto:fundora.one@gmail.com" style="color:#38bdf8;text-decoration:none;">fundora.one@gmail.com</a>
</p>
<p style="font-size:12px;color:#64748b;text-align:center;">© 2026 Fundora.one. All rights reserved.</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const base64Html = Buffer.from(htmlContent, "utf-8").toString("base64");

    const sendpulseResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendpulseApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: {
          subject: subject,
          html: base64Html,
          text: message || subject,
          from: {
            name: "Fundora",
            email: senderEmail
          },
          to: [
            {
              name: toName || "Investor",
              email: toEmail
            }
          ]
        }
      })
    });

    const responseData = await sendpulseResponse.json().catch(() => ({}));

    if (sendpulseResponse.ok && (responseData.result === true || responseData.id)) {
      return res.status(200).json({ success: true, via: "sendpulse", data: responseData });
    } else {
      const errorDetails = responseData.message || responseData.error || JSON.stringify(responseData);
      console.error(`[SendPulse API Error]:`, errorDetails);
      return res.status(sendpulseResponse.status || 500).json({
        success: false,
        error: `SendPulse Error (${sendpulseResponse.status}): ${errorDetails}`
      });
    }
  } catch (error: any) {
    console.error("[SendPulse API Network Error]:", error);
    return res.status(500).json({ success: false, error: error.message || "Email dispatch failed" });
  }
}
