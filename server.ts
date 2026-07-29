import express from "express";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables from .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Custom CORS middleware to support hybrid platforms (Capacitor WebView / Mobile APKs)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Headers, *");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Middleware to parse JSON bodies with increased limits for base64 screenshots
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper to validate Resend API key format
const isValidResendApiKey = (key: string): boolean => {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.startsWith("re_") && trimmed.length >= 25 && !trimmed.includes("12345678") && !trimmed.includes("your_");
};

  // API Route to proxy email requests for generic transactional emails & OTPs
  app.post("/api/send-email", async (req, res) => {
    const { toEmail, toName, subject, title, message, badge, badgeColor, detailsHtml, otpCode } = req.body;

    if (!toEmail || !subject) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: toEmail and subject are required."
      });
    }

    const isRealOtp = !!(otpCode && /^\d{4,8}$/.test(String(otpCode).trim()));
    const headerTitle = title || subject;
    const headerBadge = badge || "OFFICIAL NOTIFICATION";
    const headerColor = badgeColor || "#0d6efd";

    const isFullHtmlDocument = detailsHtml && (detailsHtml.includes('<!DOCTYPE') || detailsHtml.includes('<html'));
    const htmlContent = isFullHtmlDocument ? detailsHtml : `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#060819;font-family:Arial,sans-serif;color:#e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#060819;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0e122b;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
<tr>
<td style="background:linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);color:#ffffff;padding:24px;text-align:center;border-bottom:1px solid #334155;">
<div style="font-size:24px;font-weight:900;letter-spacing:2px;color:#38bdf8;">FUNDORA.ONE</div>
<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Real Estate Fractional Investment Platform</div>
</td>
</tr>
<tr>
<td style="padding:32px;">
<div style="display:inline-block;background:${headerColor}22;color:${headerColor};border:1px solid ${headerColor}55;padding:4px 12px;font-size:10px;font-weight:bold;letter-spacing:1.5px;border-radius:20px;text-transform:uppercase;margin-bottom:16px;">
${headerBadge}
</div>
<h2 style="margin-top:0;margin-bottom:16px;color:#f8fafc;font-size:20px;font-weight:700;">
${headerTitle}
</h2>
<p style="font-size:15px;color:#cbd5e1;line-height:24px;margin-bottom:16px;">
Hello ${toName || 'Investor'},
</p>
<div style="font-size:14px;color:#cbd5e1;line-height:22px;background:#070a1e;padding:18px;border-radius:12px;border:1px solid #1e293b;margin-bottom:20px;">
${message || ''}
</div>
${detailsHtml ? `<div style="margin-bottom:20px;">${detailsHtml}</div>` : ''}
${isRealOtp ? `<div style="margin:24px 0;text-align:center;"><div style="display:inline-block;background:#38bdf8;color:#0f172a;padding:16px 32px;font-size:32px;font-weight:bold;letter-spacing:6px;border-radius:10px;">${otpCode}</div></div>` : ''}
<hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
<p style="font-size:12px;color:#64748b;text-align:center;line-height:18px;">
This is an automated notification from <strong>Fundora.one</strong>.<br>
If you have any questions, contact support at <a href="mailto:fundora.one@gmail.com" style="color:#38bdf8;text-decoration:none;">fundora.one@gmail.com</a>
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

    // 1. Check Gmail / Custom SMTP credentials (Nodemailer)
    const smtpUser = (process.env.GMAIL_USER || process.env.SMTP_USER || "fundora.one@gmail.com").trim();
    const rawSmtpPass = (process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "idlxkzgnchbucgjr").trim();
    // Gmail App Passwords work best without spaces
    const smtpPass = rawSmtpPass.includes(" ") ? rawSmtpPass.replace(/\s+/g, "") : rawSmtpPass;
    const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);

    if (smtpUser && smtpPass) {
      console.log(`[Email Server] Sending "${subject}" to ${toEmail} via SMTP (${smtpUser})...`);
      try {
        const transporter = smtpHost.includes('gmail')
          ? nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: smtpUser,
                pass: smtpPass
              }
            })
          : nodemailer.createTransport({
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass
              }
            });

        await transporter.sendMail({
          from: `"Fundora.one" <${smtpUser}>`,
          to: toEmail,
          subject: subject,
          html: htmlContent
        });

        console.log(`[Email Server] Successfully sent email "${subject}" to ${toEmail} via SMTP.`);
        return res.json({ success: true, via: "smtp" });
      } catch (smtpErr: any) {
        const errMsg = smtpErr?.message || String(smtpErr);
        if (errMsg.includes("534") || errMsg.includes("Application-specific password")) {
          console.warn(`[Email Server] Gmail SMTP Auth Error (534): Google requires a valid 16-character App Password generated from https://myaccount.google.com/apppasswords with 2-Factor Authentication enabled.`);
        } else {
          console.warn(`[Email Server] SMTP Delivery failed:`, errMsg);
        }
      }
    }

    // 2. Check Resend API Key
    const resendApiKey = (process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || "").trim();
    const resendFromEmail = (process.env.RESEND_FROM_EMAIL || process.env.VITE_RESEND_FROM_EMAIL || "fundora.one@gmail.com").trim();

    if (isValidResendApiKey(resendApiKey)) {
      console.log(`[Email Server] Dispatching notification email (${subject}) to ${toEmail} via Resend...`);
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: `Fundora <${resendFromEmail}>`,
            to: [toEmail],
            subject: subject,
            html: htmlContent
          })
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log(`[Email Server] Notification email sent successfully to ${toEmail} via Resend:`, responseData);
          return res.json({ success: true, via: "resend", data: responseData });
        }
      } catch (resendErr: any) {
        console.warn(`[Email Server] Resend API failed:`, resendErr?.message || resendErr);
      }
    }

    // 3. Google Apps Script Webhook (Default for OTP verification delivery)
    const DEFAULT_GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbwHF82vYH4JVV0ANbHvi2TSnbw6O8pp3jIT75EYKOxYhezBKk1DDvAb7Ve4EU14t46S9g/exec";
    const gasProxyUrl = (process.env.VITE_SECURE_PROXY_URL || DEFAULT_GAS_PROXY_URL).trim();

    if (gasProxyUrl) {
      const isDefaultGas = gasProxyUrl.includes("AKfycbwHF82vYH4JVV0ANbHvi2TSnbw6O8pp3jIT75EYKOxYhezBKk1DDvAb7Ve4EU14t46S9g");
      if (isDefaultGas && !isRealOtp) {
        console.log(`[Email Server] Skipping default OTP proxy for non-OTP email ("${subject}") to ${toEmail}.`);
      } else {
        console.log(`[Email Server] Forwarding "${subject}" to Proxy Webhook (${gasProxyUrl}) for ${toEmail}...`);
        try {
        const proxyBody: Record<string, any> = {
          toEmail,
          recipient: toEmail,
          to: toEmail,
          email: toEmail,
          toName,
          name: toName,
          subject,
          title,
          badge: badge || 'OFFICIAL NOTIFICATION',
          badgeColor: badgeColor || '#0d6efd',
          message,
          messageHtml: htmlContent,
          detailsHtml: htmlContent,
          html: htmlContent,
          htmlBody: htmlContent,
          body: htmlContent,
          content: htmlContent,
          text: message,
        };

        const cleanOtpStr = isRealOtp ? String(otpCode).trim() : '';

        if (isRealOtp) {
          proxyBody.otpCode = cleanOtpStr;
          proxyBody.code = cleanOtpStr;
          proxyBody.otp = cleanOtpStr;
          proxyBody.passcode = cleanOtpStr;
          proxyBody.pin = cleanOtpStr;
          proxyBody.verificationCode = cleanOtpStr;
          proxyBody.verification_code = cleanOtpStr;
          proxyBody.otp_code = cleanOtpStr;
        }

        let targetUrl = gasProxyUrl;
        if (isRealOtp) {
          const qParams = new URLSearchParams({
            code: cleanOtpStr,
            otpCode: cleanOtpStr,
            otp: cleanOtpStr,
            toEmail: toEmail,
            toName: toName || 'Investor'
          }).toString();
          targetUrl = targetUrl.includes('?') ? `${targetUrl}&${qParams}` : `${targetUrl}?${qParams}`;
        }

        const gasRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(proxyBody)
        });
        if (gasRes.ok || gasRes.status === 200) {
          console.log(`[Email Server] Successfully delivered "${subject}" to ${toEmail} via Webhook.`);
          return res.json({ success: true, via: "gas_webhook" });
        }
      } catch (gasErr: any) {
        console.warn("[Email Server] GAS Webhook exception:", gasErr?.message || gasErr);
      }
      }
    }

    console.log(`[Email Server] Processed transactional notification for "${subject}" to ${toEmail} (Logged locally).`);
    return res.json({
      success: true,
      simulated: true,
      message: "Notification logged locally. To receive real emails in inbox for Deposits/Withdrawals, configure GMAIL_USER & GMAIL_PASS or VITE_RESEND_API_KEY in .env."
    });
  });

  // API Route to proxy Resend Email requests (Bypasses browser CORS policy)
  app.post("/api/send-otp", async (req, res) => {
    const { toEmail, toName, otpCode } = req.body;

    if (!toEmail || !otpCode) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: toEmail and otpCode are required."
      });
    }

    const resendApiKey = (process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || "").trim();
    const resendFromEmail = (process.env.RESEND_FROM_EMAIL || process.env.VITE_RESEND_FROM_EMAIL || "fundora.one@gmail.com").trim();
    const gasProxyUrl = process.env.VITE_SECURE_PROXY_URL || "https://script.google.com/macros/s/AKfycbwHF82vYH4JVV0ANbHvi2TSnbw6O8pp3jIT75EYKOxYhezBKk1DDvAb7Ve4EU14t46S9g/exec";

    if (!isValidResendApiKey(resendApiKey)) {
      console.log(`[Email Proxy Server] Forwarding OTP to Google Apps Script Proxy Webhook for ${toEmail}...`);
      try {
        const gasRes = await fetch(gasProxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            toEmail,
            recipient: toEmail,
            to: toEmail,
            toName,
            subject: "Fundora.one - Verification Code",
            title: "Verification Code",
            badge: "OTP CODE",
            badgeColor: "#0d6efd",
            message: `Your verification code is ${otpCode}. It will expire in 10 minutes.`,
            otpCode,
            code: otpCode
          })
        });
        if (gasRes.ok || gasRes.status === 200) {
          console.log(`[Email Proxy Server] Successfully delivered OTP to ${toEmail} via GAS Webhook.`);
          return res.json({ success: true, via: "google_apps_script" });
        }
      } catch (e: any) {
        console.warn("[Email Proxy Server] GAS OTP proxy exception:", e?.message || e);
      }
      return res.json({
        success: true,
        simulated: true,
        message: "OTP logged."
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

      console.log(`[Resend Server Proxy] Dispatching OTP email to ${toEmail} from ${resendFromEmail}...`);

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
        console.log(`[Resend Server Proxy] Email sent successfully to ${toEmail}:`, responseData);
        return res.json({ success: true, data: responseData });
      } else {
        console.log(`[Resend Server Proxy] Resend API status ${response.status} for OTP. Falling back to simulated delivery.`);
        return res.json({
          success: true,
          simulated: true,
          warning: "OTP logged (Resend API key invalid or unverified)."
        });
      }
    } catch (error: any) {
      console.log("[Resend Server Proxy] Network/Server exception in /api/send-otp:", error?.message || error);
      return res.json({
        success: true,
        simulated: true,
        warning: error.message || "An exception occurred during server-side email dispatch."
      });
    }
  });

  // API Route to analyze uploaded screenshot receipt using Gemini 2.5 Flash
  app.post("/api/analyze-receipt", async (req, res) => {
    const { base64Data, mimeType, apiKey: clientBodyKey } = req.body;

    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: base64Data is required."
      });
    }

    try {
      // 1. Initialize GoogleGenAI client (lazy initialization)
      const headerKey = req.headers['x-gemini-key'] as string;
      let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || clientBodyKey || headerKey || process.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        console.warn("[Receipt Analyzer] No valid GEMINI_API_KEY detected in env or request.");
        return res.status(400).json({
          success: false,
          error: "No valid Gemini API Key available for receipt OCR parsing."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // 2. Extract clean base64 data and mimeType if nested in data URI
      let cleanBase64 = base64Data;
      let detectedMimeType = mimeType || "image/jpeg";

      if (base64Data.startsWith("data:")) {
        const parts = base64Data.split(";base64,");
        if (parts.length === 2) {
          detectedMimeType = parts[0].replace("data:", "").split(";")[0];
          cleanBase64 = parts[1];
        }
      }

      console.log(`[Receipt Analyzer] Triggering Gemini 3.6 Flash for receipt parsing, size: ~${Math.round(cleanBase64.length / 1024)} KB, mime: ${detectedMimeType}...`);

      // 3. Formulate the multimodal parts for Gemini
      const imagePart = {
        inlineData: {
          mimeType: detectedMimeType,
          data: cleanBase64,
        },
      };

      const promptPart = {
        text: "You are an expert AI payment auditor. Carefully analyze this image of a cryptocurrency payment receipt, deposit confirmation, transfer invoice, or order screenshot (such as Quotex, Binance, OKX, Bybit, Trust Wallet, MetaMask, Bitnbox, KuCoin, etc.).\n\n" +
              "Identify and extract these EXACT fields from the screenshot:\n" +
              "1. 'amount': The exact DEPOSIT, PAYMENT, or TRANSFER amount in USDT or USD (e.g., if the receipt shows 'Paid: $12', 'Transfer: 12 USDT', 'Deposit Amount: 12', 'Total: $12', return 12). CRITICAL: DO NOT return user account balances, available balances, wallet balances, or fee amounts! If multiple amounts exist on screen, strictly select the actual transfer/deposit payment amount.\n" +
              "2. 'txid': The transaction hash, transaction ID, Order ID, Deposit ID, Ref No, or Reference Code (e.g. '124119776', 'TX...', '0x...'). Look for labels like 'Order ID', 'Deposit ID', 'Quotex Deposit ID', 'TxID', 'TxHash', 'Transaction ID', 'Ref No', 'Reference Number', 'Hash', 'ID'. Extract the clean ID string without prefixes or labels.\n" +
              "3. 'network': The matching transfer network (e.g. 'TRC20', 'BEP20', 'BSC', 'TRX'). Default to 'TRC20' if not specified.\n\n" +
              "Format the output STRICTLY as JSON matching the schema.",
      };

      let response;
      const modelsToTry = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      let lastAiErr = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Receipt Analyzer] Attempting receipt parsing with model: ${modelName}...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [imagePart, promptPart] },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  txid: {
                    type: Type.STRING,
                    description: "The transaction hash, Order ID, Deposit ID, or TxID from the screenshot.",
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: "The transfer/payment amount parsed strictly as a number.",
                  },
                  network: {
                    type: Type.STRING,
                    description: "The blockchain network ('TRC20' or 'BEP20').",
                  }
                },
                required: ["txid", "amount", "network"],
              }
            }
          });
          if (response && response.text) {
            console.log(`[Receipt Analyzer] Successfully retrieved response using ${modelName}`);
            lastAiErr = null;
            break;
          }
        } catch (modelErr: any) {
          lastAiErr = modelErr;
          console.warn(`[Receipt Analyzer] ${modelName} call failed:`, modelErr?.message || modelErr);
        }
      }

      if (!response || !response.text) {
        const errString = String(lastAiErr?.message || lastAiErr || "");
        const isQuotaExceeded = errString.includes("429") || errString.includes("quota") || errString.includes("RESOURCE_EXHAUSTED");
        console.warn(`[Receipt Analyzer] All Gemini models failed (${isQuotaExceeded ? 'Quota Exceeded 429' : 'General AI Error'}). Returning graceful manual entry fallback.`);
        
        return res.json({
          success: true,
          quotaExceeded: isQuotaExceeded,
          warning: isQuotaExceeded 
            ? "AI scanning service is busy (Quota Limit). Receipt attached successfully — please enter your TxID/Amount manually below."
            : "AI scanner could not process image details. Receipt attached successfully — please enter your TxID/Amount manually below.",
          data: {
            txid: "",
            amount: 0,
            network: "TRC20"
          }
        });
      }

      const responseText = response.text || "{}";
      console.log(`[Receipt Analyzer] Gemini Raw Response:`, responseText);
      
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
      }
      const parsedData = JSON.parse(cleanedResponse);

      return res.json({
        success: true,
        data: parsedData
      });

    } catch (error: any) {
      console.error("[Receipt Analyzer] Error parsing receipt screenshot:", error?.message || error);
      return res.json({
        success: true,
        quotaExceeded: true,
        warning: "Receipt image uploaded! Please verify or enter your TxID & Amount manually.",
        data: {
          txid: "",
          amount: 0,
          network: "TRC20"
        }
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Redirect direct /join paths to client-side SPA hash routing
  app.get("/join", (req, res) => {
    const ref = req.query.ref || "";
    const redirectUrl = ref ? `/#/register?ref=${ref}` : "/#/register";
    console.log(`[Redirect] /join path accessed. Redirecting to ${redirectUrl}`);
    res.redirect(redirectUrl);
  });

  // Redirect direct /register paths to client-side SPA hash routing
  app.get("/register", (req, res) => {
    const ref = req.query.ref || "";
    const redirectUrl = ref ? `/#/register?ref=${ref}` : "/#/register";
    console.log(`[Redirect] /register path accessed. Redirecting to ${redirectUrl}`);
    res.redirect(redirectUrl);
  });

  // Integrate Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start the Express proxy server:", err);
});
