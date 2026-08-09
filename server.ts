import express from "express";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getMessaging, TokenMessage, TopicMessage } from "firebase-admin/messaging";
import { GoogleGenAI, Type } from "@google/genai";
import { Readable } from "stream";
import { generateSmartFundoraAnswer, searchStructuredFAQ } from "./src/lib/aiKnowledgeEngine";

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin SDK
let firebaseAdminApp: App | null = null;

function initFirebaseAdmin(): App | null {
  if (firebaseAdminApp) return firebaseAdminApp;
  const activeApps = getApps();
  if (activeApps.length > 0 && activeApps[0]) {
    firebaseAdminApp = activeApps[0];
    return firebaseAdminApp;
  }

  try {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (rawServiceAccount) {
      let parsedCreds: any;
      const trimmed = rawServiceAccount.trim();
      if (trimmed.startsWith("{")) {
        parsedCreds = JSON.parse(trimmed);
      } else {
        try {
          const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
          parsedCreds = JSON.parse(decoded);
        } catch {
          parsedCreds = JSON.parse(trimmed);
        }
      }

      firebaseAdminApp = initializeApp({
        credential: cert(parsedCreds)
      });
      console.log("[Firebase Admin] Successfully initialized Firebase Admin SDK with Service Account JSON credentials.");
      return firebaseAdminApp;
    }
  } catch (err: any) {
    console.warn("[Firebase Admin] Initialization attempt warning:", err?.message || err);
  }

  return null;
}

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

  // APK Proxy & Direct Download Endpoint (Masks GitHub URL under fundora.one domain)
  const APK_GITHUB_SOURCE_URL = "https://github.com/tajammalrehmat/Fundora-Real-Estate/releases/download/Apk/app-fundora.apk";

  const handleApkDownload = async (req: express.Request, res: express.Response) => {
    try {
      console.log(`[APK Download Proxy] Request received from IP: ${req.ip}`);

      res.setHeader("Content-Disposition", 'attachment; filename="app-fundora.apk"');
      res.setHeader("Content-Type", "application/vnd.android.package-archive");
      res.setHeader("Cache-Control", "public, max-age=3600");

      const response = await fetch(APK_GITHUB_SOURCE_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        redirect: "follow"
      });

      if (!response.ok) {
        console.error(`[APK Download Proxy] Failed to fetch source APK: ${response.status} ${response.statusText}`);
        return res.redirect(302, APK_GITHUB_SOURCE_URL);
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      if (response.body) {
        const nodeReadable = Readable.fromWeb(response.body as any);
        nodeReadable.pipe(res);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } catch (err: any) {
      console.error("[APK Download Proxy Error]", err?.message || err);
      res.redirect(302, APK_GITHUB_SOURCE_URL);
    }
  };

  app.get("/api/download-apk", handleApkDownload);
  app.get("/download/app-fundora.apk", handleApkDownload);
  app.get("/app-fundora.apk", handleApkDownload);

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
    if (!isRealOtp) {
      console.log(`[Email Server] Suppressed non-OTP email ("${subject}") for ${toEmail}. Only OTP emails are enabled.`);
      return res.json({ success: true, skipped: true });
    }

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

    // 1. Check Resend API Key FIRST (Highest priority for fast, reliable delivery)
    const resendApiKey = (process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || "").trim();
    let resendFromEmail = (process.env.RESEND_FROM_EMAIL || process.env.VITE_RESEND_FROM_EMAIL || "no-reply@fundora.one").trim();

    // Resend requires verified domains like fundora.one or onboarding@resend.dev. Resend strictly rejects @gmail.com as a 'from' address.
    if (!resendFromEmail || resendFromEmail.toLowerCase().includes("gmail.com") || resendFromEmail.toLowerCase().includes("yahoo.com") || resendFromEmail.toLowerCase().includes("hotmail.com")) {
      resendFromEmail = "no-reply@fundora.one";
    }

    if (isValidResendApiKey(resendApiKey)) {
      console.log(`[Email Server] Dispatching notification email (${subject}) to ${toEmail} via Resend (from: ${resendFromEmail})...`);
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
        } else {
          const errText = await response.text();
          console.warn(`[Email Server] Resend API error status ${response.status}:`, errText);
        }
      } catch (resendErr: any) {
        console.warn(`[Email Server] Resend API exception:`, resendErr?.message || resendErr);
      }
    }

    // 2. Secondary: Check Gmail / Custom SMTP credentials (Nodemailer) if explicitly configured
    const smtpUser = (process.env.GMAIL_USER || process.env.SMTP_USER || "").trim();
    const rawSmtpPass = (process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").trim();
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

    // 3. Optional Custom Proxy Webhook (if explicitly configured via VITE_SECURE_PROXY_URL)
    const gasProxyUrl = (process.env.VITE_SECURE_PROXY_URL || "").trim();

    if (gasProxyUrl) {
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
    let resendFromEmail = (process.env.RESEND_FROM_EMAIL || process.env.VITE_RESEND_FROM_EMAIL || "no-reply@fundora.one").trim();
    if (!resendFromEmail || resendFromEmail.toLowerCase().includes("gmail.com") || resendFromEmail.toLowerCase().includes("yahoo.com") || resendFromEmail.toLowerCase().includes("hotmail.com")) {
      resendFromEmail = "no-reply@fundora.one";
    }
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

  // AI Helper: Get active Gemini client instance
  const getGeminiClient = (req: express.Request) => {
    const headerKey = req.headers['x-gemini-key'] as string;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || headerKey || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return null;
    return new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  };

  // Fundora Knowledge Base System Prompt
  const FUNDORA_SYSTEM_PROMPT = `You are Fundora AI Assistant, the official AI concierge for Fundora Real Estate Platform (fundora.one).
You assist investors worldwide with verified platform knowledge in multiple languages including English, Urdu, Roman Urdu, Arabic, Pashto, Hindi, Bengali, Spanish, French, Turkish, Chinese, etc.

FUNDORA PLATFORM FACTS & OFFICIAL DOCUMENTATION:
- Official Registered Entity: Fundora Real Estate Investment Platform Ltd (UK Companies House Registration No. 16870956).
- Official Website: https://fundora.one
- Official Support Email: fundora.one@gmail.com
- Official Mobile App: YES! Fundora provides an official downloadable Android Mobile App (Fundora APK) available directly on our website! Users can click the "Download App" / "Android APK" button in the top navigation bar or menu.

KEY FEATURES & RECENT UPDATES:
1. WALLET BINDING & DIRECT INSTANT UNBINDING:
   - Wallet binding for USDT receiving addresses is located in the **Wallet Menu**.
   - Supports USDT (BEP20 Network) and USDT (TRC20 Network).
   - Once bound, the wallet form hides automatically, and two compact side-by-side micro buttons appear: "🔓 BEP20 Unbind" and "🔓 TRC20 Unbind".
   - Unbinding is **INSTANT and DIRECT** with a single click! Users no longer need to wait for admin approval to reset or update their wallet address.
   - Once unbound, users can immediately bind a new receiving address for withdrawals.
   - Wallet configuration is cleanly centralized in the Wallet Menu.

2. PROPERTY PROJECTS & ROI DETAILS:
   - **Emaar Downtown Boulevard Suites** (Downtown Dubai, UAE): Active project, $250 per share, 40.5% APR Expected ROI (~0.8% to 1.5% Daily Yield), 2 Months duration.
   - **Kensington Palace Gardens Suites** (London, UK): Fixed 50.8% APR Expected ROI, 2 Months duration, $150 per share (Status: Sold Out / Fully Funded).

3. DEPOSITS & AI RECEIPT SCANNER:
   - Minimum deposit: 10 USDT (TRC20 & BEP20 accepted).
   - Instant AI Receipt Scanning: Upload a screenshot of your Binance/TrustWallet/OKX payment receipt, and Fundora's Gemini AI automatically extracts the TxID, Amount, and Network!
   - Users can also manually enter TxHash/TxID if preferred.

4. WITHDRAWALS:
   - Minimum withdrawal: 10 USDT.
   - Requires a bound USDT BEP20 or TRC20 address (configured in the Wallet menu).
   - Processed via automated security queue within 1 to 24 hours.

5. DAILY YIELDS & PROFIT CLAIMING:
   - Daily rental yield distributions range between 0.8% and 1.5% daily.
   - Users can claim profit anytime on the Overview dashboard via the "Claim Profit" button.

6. REFERRAL PROGRAM & VIP RANKS:
   - Bronze Shield (Level 1): 10% instant direct referral commission.
   - Silver Partner (Level 2): 5% team commission ($500 team volume or 3 active members).
   - Gold Director (Level 3): 2% team commission + yield boost vouchers ($2,000+ volume).
   - Platinum Trustee (Level 4): VIP direct support + co-ownership rights ($10,500+ volume).

7. COMMUNITY HUB & LIVE CHAT:
   - Community channels for global investor discussions, daily AI real estate tips, automatic multi-language translation, and AI chat summaries.

RULES FOR AI ASSISTANT:
1. Direct Answers: Answer the user's specific question directly, concisely, and accurately using verified platform facts. Do NOT paste generic boilerplate text when answering a specific question.
2. Language Matching: Answer in the EXACT language used by the user (English, Urdu script, Roman Urdu e.g. "wallet unbind kaise karein?", Arabic, Hindi, etc.).
   - Example Roman Urdu query: "wallet unbind kaise karein?"
     Answer: "Fundora me wallet unbind karna boht asan hai! Wallet Menu me jayen, jahan aapko BEP20 aur TRC20 k samne micro buttons '🔓 BEP20 Unbind' aur '🔓 TRC20 Unbind' milenge. Click karte he aapka address instantly unbind ho jaye ga aur aap naya address enter kar sakte hain."
3. Accuracy: Always quote exact figures (Emaar Dubai 40.5% ROI, Kensington London 50.8% ROI 2-month term, 10 USDT min deposit/withdrawal, instant direct unbind in Wallet menu).
4. Escalation: If a user has a complex payment issue or asks for direct human support, add "[ESCALATE_TO_HUMAN]" at the end.

Respond clearly using rich markdown formatting (bolding key terms).`;

  // Endpoint: Floating AI Assistant
  app.post("/api/ai/assistant", async (req, res) => {
    const { message, chatHistory, language } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, error: "Message string is required." });
    }

    try {
      const faqResult = searchStructuredFAQ(message, language || "en");
      const ai = getGeminiClient(req);

      if (!ai) {
        const smartFallback = faqResult.matched && faqResult.reply
          ? { reply: faqResult.reply, escalate: faqResult.escalate }
          : generateSmartFundoraAnswer(message, language || "en");

        return res.json({
          success: true,
          reply: smartFallback.reply,
          escalate: smartFallback.escalate
        });
      }

      const formattedHistory = Array.isArray(chatHistory)
        ? chatHistory.map((h: any) => `${h.sender === "user" ? "User" : "Assistant"}: ${h.text}`).join("\n")
        : "";

      const faqContext = faqResult.retrievedContext 
        ? `\n\nSTRUCTURED FAQ RETRIEVAL CONTEXT:\n${faqResult.retrievedContext}\n` 
        : "";

      const prompt = `${FUNDORA_SYSTEM_PROMPT}${faqContext}\n\nRecent Conversation History:\n${formattedHistory}\n\nUser Question (${language || "en"}): "${message}"\n\nDirect Answer:`;

      const modelsToTry = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      let text = "";
      let lastAiErr = null;

      for (const modelName of modelsToTry) {
        try {
          const aiRes = await ai.models.generateContent({
            model: modelName,
            contents: prompt
          });
          if (aiRes && aiRes.text && aiRes.text.trim()) {
            text = aiRes.text.trim();
            break;
          }
        } catch (mErr: any) {
          lastAiErr = mErr;
          console.warn(`[AI Assistant] Model ${modelName} failed:`, mErr?.message || mErr);
        }
      }

      if (!text.trim()) {
        const smartFallback = faqResult.matched && faqResult.reply
          ? { reply: faqResult.reply, escalate: faqResult.escalate }
          : generateSmartFundoraAnswer(message, language || "en");

        return res.json({
          success: true,
          reply: smartFallback.reply,
          escalate: smartFallback.escalate
        });
      }

      const shouldEscalate = text.includes("[ESCALATE_TO_HUMAN]") || message.toLowerCase().includes("human") || message.toLowerCase().includes("admin") || faqResult.escalate;
      const cleanReply = text.replace("[ESCALATE_TO_HUMAN]", "").trim();

      return res.json({
        success: true,
        reply: cleanReply,
        escalate: shouldEscalate
      });
    } catch (err: any) {
      console.warn("[AI Assistant Proxy Error]", err?.message || err);
      const faqResult = searchStructuredFAQ(message, language || "en");
      const smartFallback = faqResult.matched && faqResult.reply
        ? { reply: faqResult.reply, escalate: faqResult.escalate }
        : generateSmartFundoraAnswer(message, language || "en");

      return res.json({
        success: true,
        reply: smartFallback.reply,
        escalate: smartFallback.escalate
      });
    }
  });

  // Endpoint: AI Community Auto-Reply
  app.post("/api/ai/community-reply", async (req, res) => {
    const { promptText, channelName } = req.body;
    try {
      const faqResult = searchStructuredFAQ(promptText || "", "en");
      const ai = getGeminiClient(req);
      if (!ai) {
        const smartFallback = faqResult.matched && faqResult.reply
          ? { reply: faqResult.reply, escalate: faqResult.escalate }
          : generateSmartFundoraAnswer(promptText || "", "en", channelName);

        return res.json({
          success: true,
          reply: smartFallback.reply
        });
      }

      const faqContext = faqResult.retrievedContext 
        ? `\n\nSTRUCTURED FAQ RETRIEVAL CONTEXT:\n${faqResult.retrievedContext}\n` 
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `${FUNDORA_SYSTEM_PROMPT}${faqContext}\n\nA member posted this question in channel/DM "${channelName || "Community"}":\n"${promptText}"\n\nProvide a direct, friendly, and precise answer specifically addressing their question in the same language as the input (Urdu, Roman Urdu, Arabic, English, etc.):`
      });

      const text = response?.text || "";
      if (!text.trim()) {
        const smartFallback = faqResult.matched && faqResult.reply
          ? { reply: faqResult.reply, escalate: faqResult.escalate }
          : generateSmartFundoraAnswer(promptText || "", "en", channelName);

        return res.json({
          success: true,
          reply: smartFallback.reply
        });
      }

      return res.json({
        success: true,
        reply: text
      });
    } catch (err: any) {
      const faqResult = searchStructuredFAQ(promptText || "", "en");
      const smartFallback = faqResult.matched && faqResult.reply
        ? { reply: faqResult.reply, escalate: faqResult.escalate }
        : generateSmartFundoraAnswer(promptText || "", "en", channelName);

      return res.json({
        success: true,
        reply: smartFallback.reply
      });
    }
  });

  // Endpoint: AI Translate English ↔ Urdu
  app.post("/api/ai/translate", async (req, res) => {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ success: false, error: "Text is required" });

    try {
      const ai = getGeminiClient(req);
      if (!ai) {
        return res.json({ success: true, translatedText: text });
      }

      const prompt = `Translate the following message accurately into ${targetLang === "ur" ? "Urdu" : "English"}. Return ONLY the translated string without commentary:\n\n"${text}"`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });

      return res.json({
        success: true,
        translatedText: response?.text?.trim() || text
      });
    } catch (err) {
      return res.json({ success: true, translatedText: text });
    }
  });

  // Endpoint: AI Thread Summarizer
  app.post("/api/ai/summarize", async (req, res) => {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "Messages array required" });
    }

    try {
      const ai = getGeminiClient(req);
      if (!ai) {
        return res.json({
          success: true,
          summary: "• Community discussion regarding real estate co-ownership yields and property updates."
        });
      }

      const chatText = messages.map((m: any) => `${m.senderName}: ${m.text}`).join("\n");
      const prompt = `Summarize this community discussion into 3 key bullet points with emojis:\n\n${chatText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });

      return res.json({
        success: true,
        summary: response?.text || "• Thread summary generated successfully."
      });
    } catch (err) {
      return res.json({
        success: true,
        summary: "• Community discussion on real estate investments and daily profit claims."
      });
    }
  });

  // Endpoint: AI Spam & Abuse Detection
  app.post("/api/ai/spam-check", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ success: true, isSpam: false });

    try {
      const ai = getGeminiClient(req);
      if (!ai) return res.json({ success: true, isSpam: false });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Analyze this chat message for spam, phishing, scams, or offensive language:\n\n"${text}"\n\nReturn JSON strictly matching schema.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isSpam: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            },
            required: ["isSpam"]
          }
        }
      });

      const parsed = JSON.parse(response?.text || '{"isSpam": false}');
      return res.json({ success: true, isSpam: parsed.isSpam, reason: parsed.reason });
    } catch (err) {
      return res.json({ success: true, isSpam: false });
    }
  });

  // Endpoint: Daily Investment Tip Generator
  app.get("/api/ai/daily-tip", async (req, res) => {
    try {
      const ai = getGeminiClient(req);
      if (!ai) {
        return res.json({
          success: true,
          tipEn: "💡 Tip: Diversifying your portfolio across commercial and residential properties maximizes steady rental yield cash flow!",
          tipUr: "💡 مشورہ: تجارتی اور رہائشی جائیدادوں میں یکساں سرمایہ کاری آپ کے روزانہ منافع کو مستحکم بناتی ہے۔"
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Generate a short 1-sentence real estate investment wisdom tip in both English and Urdu. Return JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tipEn: { type: Type.STRING },
              tipUr: { type: Type.STRING }
            },
            required: ["tipEn", "tipUr"]
          }
        }
      });

      const data = JSON.parse(response?.text || "{}");
      return res.json({
        success: true,
        tipEn: data.tipEn || "💡 Diversify across luxury and residential property shares to optimize daily yields.",
        tipUr: data.tipUr || "💡 روزانہ منافع اور مستحکم پیداوار کے لیے مختلف جائیدادوں میں حصہ لیں۔"
      });
    } catch (err) {
      return res.json({
        success: true,
        tipEn: "💡 Reinvesting your daily yield claims unlocks compound growth over time!",
        tipUr: "💡 اپنے روزانہ کے منافع کو دوبارہ منتقل کرنے سے وقت کے ساتھ مرکب ترقی ملتی ہے۔"
      });
    }
  });

  // API Endpoint: FCM Production Push Notification Gateway using Official Firebase Admin SDK
  app.post("/api/notifications/send-fcm", async (req, res) => {
    const { userEmail, userId, title, body, type, route, channelId, extraData, targetToken } = req.body;

    if (!userEmail && !userId && !targetToken) {
      return res.status(400).json({ success: false, error: "Missing recipient: userEmail, userId, or targetToken required." });
    }

    try {
      console.log(`[FCM Backend Gateway] Push Notification request received for "${userEmail || userId || 'direct_token'}": "${title}" - "${body}"`);

      const adminApp = initFirebaseAdmin();

      if (adminApp) {
        const notificationTitle = title || "Fundora Notification";
        const notificationBody = body || "";
        const targetChannel = channelId || "fundora_notifications";

        const messageData: Record<string, string> = {
          title: String(notificationTitle),
          body: String(notificationBody),
          type: String(type || "system"),
          route: String(route || "#/overview"),
          timestamp: new Date().toISOString()
        };

        if (extraData && typeof extraData === "object") {
          for (const [key, val] of Object.entries(extraData)) {
            messageData[key] = String(val);
          }
        }

        // Send via direct device FCM Token if available
        if (targetToken) {
          try {
            const tokenMsg: TokenMessage = {
              token: targetToken,
              notification: {
                title: notificationTitle,
                body: notificationBody
              },
              data: messageData,
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  channelId: targetChannel,
                  clickAction: "FLUTTER_NOTIFICATION_CLICK"
                }
              }
            };

            const response = await getMessaging(adminApp).send(tokenMsg);
            console.log(`[FCM Backend Gateway] Firebase Admin SDK successfully dispatched push notification to token: ${response}`);
            return res.json({ success: true, via: "firebase_admin_sdk", target: "token", messageId: response });
          } catch (tokenErr: any) {
            console.warn(`[FCM Backend Gateway] Direct token dispatch warning: ${tokenErr?.message || tokenErr}`);
          }
        }

        // Send via User Topic if email is provided
        if (userEmail) {
          try {
            const topicName = `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const topicMsg: TopicMessage = {
              topic: topicName,
              notification: {
                title: notificationTitle,
                body: notificationBody
              },
              data: messageData,
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  channelId: targetChannel,
                  clickAction: "FLUTTER_NOTIFICATION_CLICK"
                }
              }
            };

            const response = await getMessaging(adminApp).send(topicMsg);
            console.log(`[FCM Backend Gateway] Firebase Admin SDK successfully dispatched push notification to topic "${topicName}": ${response}`);
            return res.json({ success: true, via: "firebase_admin_sdk", target: "topic", topicName, messageId: response });
          } catch (topicErr: any) {
            console.warn(`[FCM Backend Gateway] Topic message dispatch warning: ${topicErr?.message || topicErr}`);
          }
        }
      }

      // Legacy Server Key Fallback if Firebase Admin SDK is not initialized
      const fcmKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_MESSAGING_KEY || "";
      if (fcmKey && (targetToken || userEmail)) {
        try {
          const fcmPayload = {
            to: targetToken || `/topics/user_${(userEmail || '').replace(/[^a-zA-Z0-9]/g, '_')}`,
            priority: "high",
            notification: {
              title: title || "Fundora Notification",
              body: body || "",
              sound: "default",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              channel_id: channelId || "fundora_notifications"
            },
            data: {
              title: title || "",
              body: body || "",
              type: type || "system",
              route: route || "#/overview",
              timestamp: new Date().toISOString(),
              ...(extraData || {})
            }
          };

          const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Authorization": `key=${fcmKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(fcmPayload)
          });

          if (fcmRes.ok) {
            const fcmData = await fcmRes.json();
            console.log(`[FCM Backend Gateway] Legacy FCM Server Key successfully dispatched push notification:`, fcmData);
            return res.json({ success: true, via: "fcm_server_key_fallback", fcmData });
          }
        } catch (fcmErr: any) {
          console.warn("[FCM Backend Gateway] FCM legacy direct HTTP request error:", fcmErr?.message || fcmErr);
        }
      }

      console.log(`[FCM Backend Gateway] Notification logged and recorded for ${userEmail || userId}. Channel: ${channelId || 'fundora_notifications'}`);
      return res.json({
        success: true,
        logged: true,
        recipient: userEmail || userId,
        title,
        body,
        type,
        channelId: channelId || "fundora_notifications",
        note: "Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable to enable live Firebase Admin SDK push delivery."
      });
    } catch (err: any) {
      console.error("[FCM Backend Gateway Error]", err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || "Internal FCM dispatch error" });
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
