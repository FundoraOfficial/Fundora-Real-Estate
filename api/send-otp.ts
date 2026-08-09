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

  const resendApiKey = (process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || "").trim();
  let resendFromEmail = (process.env.RESEND_FROM_EMAIL || process.env.VITE_RESEND_FROM_EMAIL || "no-reply@fundora.one").trim();
  if (!resendFromEmail || resendFromEmail.toLowerCase().includes("gmail.com") || resendFromEmail.toLowerCase().includes("yahoo.com") || resendFromEmail.toLowerCase().includes("hotmail.com")) {
    resendFromEmail = "no-reply@fundora.one";
  }

  if (!resendApiKey) {
    console.error("Resend API key is not configured in Vercel environment variables.");
    return res.status(500).json({
      success: false,
      error: "Resend API Key is not configured on the server. Please add your RESEND_API_KEY in the Vercel project environment variables settings."
    });
  }

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
<hr>
<p style="font-size:13px;color:#999;text-align:center;">
© 2026 Fundora. All rights reserved.
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

    console.log(`[Vercel Serverless] Dispatching OTP email to ${toEmail}...`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `Fundora <${resendFromEmail}>`,
        to: [toEmail],
        subject: "Your Fundora Verification Code",
        html: htmlContent
      })
    });

    if (response.ok) {
      const responseData = await response.json();
      return res.status(200).json({ success: true, data: responseData });
    } else {
      const errorText = await response.text();
      console.error(`[Vercel Serverless] Resend API failed:`, errorText);
      return res.status(response.status).json({
        success: false,
        error: errorText || "Resend API failed to accept the email."
      });
    }
  } catch (error: any) {
    console.error("[Vercel Serverless] Network exception during Resend proxy:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "An exception occurred during email dispatch."
    });
  }
}
