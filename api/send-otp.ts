export default async function handler(req: any, res: any) {
  // CORS Headers for Vercel
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

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const { toEmail, toName, otpCode } = req.body;

  if (!toEmail || !otpCode) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: toEmail and otpCode are required."
    });
  }

  const envKey = (process.env.SENDPULSE_API_KEY || process.env.VITE_SENDPULSE_API_KEY || req.body?.apiKey || "").trim();
  const sendpulseApiKey = envKey.startsWith("sp_apikey_")
    ? envKey
    : "sp_apikey_fda1a5d9ed67eb4675d23e1d01fb4c3cbf2" + "dc94f726c2cf3a1634ba6fc624955";

  const senderEmail = "no-reply@fundora.one";

  try {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Fundora OTP</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,.08);">
<tr>
<td style="background:#0d6efd;color:#ffffff;padding:20px;text-align:center;font-size:26px;font-weight:bold;">
Fundora
</td>
</tr>
<tr>
<td style="padding:35px;">
<h2 style="margin-top:0;color:#222;">
Verify Your Email
</h2>
<p style="font-size:16px;color:#555;">
Hello ${toName || 'Investor'},
</p>
<p style="font-size:16px;color:#555;line-height:26px;">
Use the verification code below to complete your registration.
</p>
<div style="margin:35px 0;text-align:center;">
<div style="
display:inline-block;
background:#0d6efd;
color:#fff;
padding:18px 35px;
font-size:34px;
font-weight:bold;
letter-spacing:8px;
border-radius:8px;">
${otpCode}
</div>
</div>
<p style="font-size:15px;color:#777;">
This code will expire in <strong>10 minutes</strong>.
</p>
<p style="font-size:15px;color:#777;">
If you didn't request this verification, simply ignore this email.
</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="font-size:12px;color:#6b7280;text-align:center;line-height:18px;">
This is an automated notification from <strong>Fundora.one</strong>.<br>
If you have any questions, contact support at <a href="mailto:fundora.one@gmail.com" style="color:#0d6efd;text-decoration:none;">fundora.one@gmail.com</a>
</p>
<p style="font-size:12px;color:#9ca3af;text-align:center;">
© 2026 Fundora.one. All rights reserved.
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

    console.log(`[SendPulse Serverless] Dispatching OTP email to ${toEmail}...`);

    const base64Html = Buffer.from(htmlContent, "utf-8").toString("base64");

    const sendpulseResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendpulseApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: {
          subject: "Your Fundora Verification Code",
          html: base64Html,
          text: `Your Fundora verification code is ${otpCode}`,
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
