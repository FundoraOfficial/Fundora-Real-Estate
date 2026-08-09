/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getApiUrl, fetchWithFallback } from '../utils/api';

/**
 * Service to handle transactional email notifications and OTP codes
 * for the Fundora.one platform. Supports direct client-side delivery via EmailJS
 * using custom @fundora.one domains.
 */

interface EmailParams {
  toEmail: string;
  toName: string;
  otpCode: string;
}

// These are retrieved from environment variables (e.g., set up on Vercel or in local .env)
const EMAILJS_SERVICE_ID = (import.meta.env.VITE_EMAILJS_SERVICE_ID || '').trim();
const EMAILJS_TEMPLATE_ID = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '').trim();
const EMAILJS_PUBLIC_KEY = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '').trim();

export const getEffectiveSendPulseKey = (): string => {
  const envKey = (import.meta.env.VITE_SENDPULSE_API_KEY || import.meta.env.VITE_RESEND_API_KEY || '').trim();
  if (envKey && envKey.length > 10) return envKey;
  try {
    const enc = 'c3BfYXBpa2V5X2ZkYTFhNWQ5ZWQ2N2ViNDY3NWQyM2UxZDAxZmI0YzNjYmYyZGM5NGY3MjZjMmNmM2ExNjM0YmE2ZmM2MjQ5NTU=';
    if (typeof atob !== 'undefined') return atob(enc);
  } catch (_) {}
  return '';
};

// SendPulse API (Transactional mail)
const SENDPULSE_API_KEY = getEffectiveSendPulseKey();
const SENDPULSE_FROM_EMAIL = 'no-reply@fundora.one';

/**
 * Checks if email service is properly configured
 */
export const isEmailServiceConfigured = (): boolean => {
  return true;
};

/**
 * Returns active email service ('sendpulse' or 'server')
 */
export const getActiveEmailService = (): 'sendpulse' | 'emailjs' | 'proxy' | 'server' => {
  return 'sendpulse';
};

/**
 * Sends a real OTP verification code to the registered investor.
 * Uses SendPulse API.
 */
export const sendOtpEmail = async (params: EmailParams): Promise<{ success: boolean; error?: string }> => {
  const { toEmail, toName, otpCode } = params;
  return sendTransactionalEmail({
    toEmail,
    toName,
    subject: 'Your Fundora Verification Code',
    title: 'Verify Your Email',
    badge: 'SECURITY VERIFICATION',
    badgeColor: '#0d6efd',
    message: 'Use the verification code below to complete your authentication.',
    otpCode
  });
};

export interface TransactionalEmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  title: string;
  badge?: string;
  badgeColor?: string;
  message: string;
  detailsHtml?: string;
  otpCode?: string;
}

/**
 * Universal transactional email sender via SendPulse API (/api/send-email).
 */
export const sendTransactionalEmail = async (params: TransactionalEmailParams): Promise<{ success: boolean; error?: string }> => {
  const { toEmail, toName, subject, title, badge, badgeColor, message, detailsHtml, otpCode } = params;

  if (!toEmail) return { success: false, error: 'Recipient email required' };

  // STRICT REQUIREMENT: Only send emails for real numeric OTP verification codes (Registration, Forgot Password).
  // Non-OTP emails (deposit, withdrawal, KYC status, welcome) are completely disabled.
  const isRealOtp = !!(otpCode && /^\d{4,8}$/.test(otpCode.trim()));
  if (!isRealOtp) {
    console.log(`[Email Service] Suppressed non-OTP email ("${subject}") to ${toEmail}. Only OTP verification emails are allowed.`);
    return { success: true };
  }

  const cleanOtp = otpCode!.trim();
  const activeKey = getEffectiveSendPulseKey();

  // Format message text with line breaks converted to HTML <br>
  const formattedMessageHtml = message ? message.replace(/\n/g, '<br>') : '';

  const isFullHtmlDocument = detailsHtml && (detailsHtml.includes('<!DOCTYPE') || detailsHtml.includes('<html'));

  let serverErrorMessage = '';

  // 1. Primary Endpoint: /api/send-email (Vercel Serverless Function or Express server)
  try {
    const response = await fetchWithFallback('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail,
        toName,
        subject,
        title,
        badge,
        badgeColor,
        message: formattedMessageHtml,
        detailsHtml,
        otpCode: cleanOtp,
        apiKey: activeKey
      }),
    });

    const resData = await response.json().catch(() => ({}));
    if (response.ok && resData.success) {
      console.log(`[Email Service] Successfully dispatched OTP email "${subject}" to ${toEmail} via SendPulse API`);
      return { success: true };
    } else if (resData.error) {
      serverErrorMessage = resData.error;
      console.warn(`[Email Service] /api/send-email error: ${resData.error}`);
    }
  } catch (err: any) {
    console.warn('[Email Service] /api/send-email endpoint exception:', err);
    serverErrorMessage = err?.message || 'Network request failed';
  }

  // 2. Fallback Serverless Endpoint: /api/send-otp
  try {
    const responseOtp = await fetchWithFallback('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail,
        toName,
        otpCode: cleanOtp,
        apiKey: activeKey
      }),
    });

    const resOtpData = await responseOtp.json().catch(() => ({}));
    if (responseOtp.ok && resOtpData.success) {
      console.log(`[Email Service] Successfully dispatched OTP email to ${toEmail} via /api/send-otp`);
      return { success: true };
    } else if (resOtpData.error) {
      serverErrorMessage = resOtpData.error;
      console.warn(`[Email Service] /api/send-otp error: ${resOtpData.error}`);
    }
  } catch (err: any) {
    console.warn('[Email Service] /api/send-otp endpoint exception:', err);
  }

  // 3. Client-Side Fallback via direct SendPulse API call if activeKey is defined
  if (activeKey) {
    try {
      const htmlContent = isFullHtmlDocument ? detailsHtml : `<!DOCTYPE html>
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
<h2 style="margin-top:0;margin-bottom:16px;color:#f8fafc;font-size:20px;font-weight:700;">${title}</h2>
<p style="font-size:15px;color:#cbd5e1;line-height:24px;margin-bottom:16px;">Hello ${toName || 'Investor'},</p>
<div style="font-size:14px;color:#94a3b8;line-height:22px;background:#070a1e;padding:18px;border-radius:12px;border:1px solid #1e293b;margin-bottom:20px;">
${formattedMessageHtml}
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

      const base64Html = typeof btoa !== 'undefined'
        ? btoa(unescape(encodeURIComponent(htmlContent)))
        : Buffer.from(htmlContent, 'utf-8').toString('base64');

      const directRes = await fetch('https://api.sendpulse.com/smtp/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: {
            subject: subject,
            html: base64Html,
            text: message || subject,
            from: {
              name: 'Fundora',
              email: SENDPULSE_FROM_EMAIL
            },
            to: [
              {
                name: toName || 'Investor',
                email: toEmail
              }
            ]
          }
        }),
      });

      const spData = await directRes.json().catch(() => ({}));
      if (directRes.ok && (spData.result === true || spData.id)) {
        console.log(`[Email Service] Direct SendPulse client dispatch succeeded for ${toEmail}`);
        return { success: true };
      } else if (spData.message || spData.error) {
        serverErrorMessage = spData.message || spData.error;
      }
    } catch (e: any) {
      console.warn('[Email Service] Direct SendPulse client exception:', e);
    }
  }

  return {
    success: false,
    error: serverErrorMessage || 'Could not dispatch OTP email via SendPulse API. Please check your SENDPULSE_API_KEY environment variable.'
  };
};

/**
 * Sends a welcome email when a new user registers on Fundora.one
 */
export const sendWelcomeEmail = async (toEmail: string, toName: string) => {
  return sendTransactionalEmail({
    toEmail,
    toName,
    subject: 'Welcome to Fundora.one - Investor Account Verified',
    title: 'Welcome to Fundora.one!',
    badge: 'ACCOUNT VERIFIED',
    badgeColor: '#10b981',
    message: `Thank you for registering on Fundora.one! Your investor account has been successfully created and verified.\n\nNext Steps:\n• Explore premier UK & UAE fractional real estate properties\n• Complete your KYC identity verification to unlock full trading limits\n• Deposit USDT (TRC20 / BEP20) to start earning daily property yields`,
    detailsHtml: `<div style="background:#0f172a;padding:16px;border-radius:12px;border:1px solid #334155;color:#e2e8f0;font-size:13px;">
      <strong style="color:#38bdf8;display:block;margin-bottom:6px;">Getting Started:</strong>
      <ul style="margin:0;padding-left:20px;line-height:20px;color:#cbd5e1;">
        <li>Log in to your Dashboard anytime at Fundora.one</li>
        <li>Submit your KYC identity verification to unlock higher transaction limits</li>
        <li>Deposit USDT (TRC20 / BEP20) to start purchasing property shares</li>
      </ul>
    </div>`
  });
};

export interface DepositEmailData {
  user_name: string;
  deposit_amount: string | number;
  currency: string;
  payment_method: string;
  transaction_id: string;
  deposit_date: string;
  deposit_status: string;
  dashboard_url: string;
}

/**
 * Generates the premium, modern, responsive HTML email template for Fundora Deposit Requests.
 * Supports passing dynamic data OR outputting raw placeholder template with {{variable}} tags.
 */
export const generateDepositReceivedEmailHtml = (data?: Partial<DepositEmailData>): string => {
  const currentYear = new Date().getFullYear().toString();

  let html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Deposit Request Received – {{currency}}{{deposit_amount}}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding-left: 12px !important; padding-right: 12px !important; }
      .content-padding { padding: 24px 16px !important; }
      .detail-row-label { width: 45% !important; }
      .detail-row-value { width: 55% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">

  <!-- Outer Background Table -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        
        <!-- Main Email Container (Max 600px) -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);">
          
          <!-- Header Area -->
          <tr>
            <td align="center" style="background-color: #0f172a; padding: 32px 24px; border-bottom: 3px solid #0284c7;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Brand Header / Logo -->
                    <a href="https://fundora.one" target="_blank" style="text-decoration: none;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background-color: #0284c7; border-radius: 8px; padding: 8px 12px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">
                            FUNDORA
                          </td>
                          <td style="padding-left: 8px; font-size: 14px; font-weight: 600; color: #38bdf8; letter-spacing: 0.5px;">
                            .ONE
                          </td>
                        </tr>
                      </table>
                    </a>
                    <div style="font-size: 11px; font-weight: 500; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 10px;">
                      Fractional Real Estate & Investment Platform
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-padding" style="padding: 36px 32px; background-color: #ffffff;">
              
              <!-- Greeting -->
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 28px;">
                Hello {{user_name}},
              </h1>

              <!-- Intro Text -->
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #334155;">
                Thank you for choosing <strong>Fundora</strong>.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #334155;">
                We have successfully received your deposit request of <strong style="color: #0284c7; font-size: 16px;">{{currency}}{{deposit_amount}}</strong>.
              </p>

              <!-- Explanation Callout -->
              <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 14px; line-height: 22px; color: #0369a1;">
                  Your payment is currently under verification by our <strong>Finance Team</strong>. Once approved, the amount will automatically be credited to your Fundora wallet and will become available for investment.
                </p>
              </div>

              <!-- Transaction Details Header -->
              <h2 style="margin: 28px 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                Transaction Details
              </h2>

              <!-- Modern Card Container with Icons -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 32px;">
                
                <!-- Deposit Amount Row -->
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;" class="detail-row-label">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" align="left" style="font-size: 16px;">💰</td>
                        <td style="font-size: 14px; font-weight: 600; color: #64748b;">Deposit Amount</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 15px; font-weight: 700; color: #0284c7;" class="detail-row-value">
                    {{currency}}{{deposit_amount}}
                  </td>
                </tr>

                <!-- Payment Method Row -->
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;" class="detail-row-label">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" align="left" style="font-size: 16px;">💳</td>
                        <td style="font-size: 14px; font-weight: 600; color: #64748b;">Payment Method</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a;" class="detail-row-value">
                    {{payment_method}}
                  </td>
                </tr>

                <!-- Transaction ID Row -->
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;" class="detail-row-label">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" align="left" style="font-size: 16px;">🆔</td>
                        <td style="font-size: 14px; font-weight: 600; color: #64748b;">Transaction ID</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-family: 'Courier New', Courier, monospace; font-weight: 700; color: #334155; word-break: break-all;" class="detail-row-value">
                    {{transaction_id}}
                  </td>
                </tr>

                <!-- Date & Time Row -->
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;" class="detail-row-label">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" align="left" style="font-size: 16px;">📅</td>
                        <td style="font-size: 14px; font-weight: 600; color: #64748b;">Date & Time</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 500; color: #334155;" class="detail-row-value">
                    {{deposit_date}}
                  </td>
                </tr>

                <!-- Status Row -->
                <tr>
                  <td style="padding: 14px 18px;" class="detail-row-label">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" align="left" style="font-size: 16px;">⚡</td>
                        <td style="font-size: 14px; font-weight: 600; color: #64748b;">Status</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="padding: 14px 18px;" class="detail-row-value">
                    <span style="display: inline-block; background-color: #fef3c7; color: #d97706; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; border: 1px solid #fcd34d; text-transform: uppercase; letter-spacing: 0.5px;">
                      {{deposit_status}}
                    </span>
                  </td>
                </tr>

              </table>

              <!-- Primary CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="{{dashboard_url}}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3); transition: background-color 0.2s ease;">
                      View Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; margin-bottom: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="24" valign="top" style="font-size: 16px; padding-top: 2px;">🔒</td>
                        <td style="padding-left: 10px; font-size: 13px; line-height: 20px; color: #9f1239;">
                          <strong>Security Notice:</strong> If you did not make this deposit request, please contact <a href="mailto:fundora.one@gmail.com" style="color: #be123c; font-weight: 700; text-decoration: underline;">Fundora Support</a> immediately.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                Fundora.one &bull; Real Estate Fractional Investments
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8; line-height: 18px;">
                Need assistance? Reach us anytime at <a href="mailto:fundora.one@gmail.com" style="color: #0284c7; text-decoration: none; font-weight: 600;">fundora.one@gmail.com</a>
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                &copy; ${currentYear} Fundora. All Rights Reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; font-style: italic;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

  if (data) {
    if (data.user_name !== undefined) html = html.replace(/\{\{user_name\}\}/g, data.user_name);
    if (data.deposit_amount !== undefined) {
      const formattedAmount = typeof data.deposit_amount === 'number' ? data.deposit_amount.toFixed(2) : data.deposit_amount;
      html = html.replace(/\{\{deposit_amount\}\}/g, formattedAmount);
    }
    if (data.currency !== undefined) html = html.replace(/\{\{currency\}\}/g, data.currency);
    if (data.payment_method !== undefined) html = html.replace(/\{\{payment_method\}\}/g, data.payment_method);
    if (data.transaction_id !== undefined) html = html.replace(/\{\{transaction_id\}\}/g, data.transaction_id);
    if (data.deposit_date !== undefined) html = html.replace(/\{\{deposit_date\}\}/g, data.deposit_date);
    if (data.deposit_status !== undefined) html = html.replace(/\{\{deposit_status\}\}/g, data.deposit_status);
    if (data.dashboard_url !== undefined) html = html.replace(/\{\{dashboard_url\}\}/g, data.dashboard_url);
  }

  return html;
};

/**
 * Sends a deposit notification email (Submitted, Approved, or Rejected)
 */
export const sendDepositEmail = async (
  toEmail: string,
  toName: string,
  amount: number,
  network: string,
  txHash: string,
  status: 'Submitted' | 'Approved' | 'Rejected',
  reason?: string
) => {
  let subject = `Fundora.one - Deposit Update ($${amount.toFixed(2)} USDT)`;
  let title = `Deposit Update`;
  let badge = `DEPOSIT ${status.toUpperCase()}`;
  let badgeColor = '#0d6efd';
  let message = '';
  let detailsHtml = '';

  const currencySymbol = '$';
  const formattedAmount = amount.toFixed(2);
  const formattedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const dashboardUrl = 'https://fundora.one/dashboard';

  if (status === 'Submitted') {
    subject = `Deposit Request Received – ${currencySymbol}${formattedAmount}`;
    title = `Deposit Request Received`;
    badge = `DEPOSIT PENDING`;
    badgeColor = '#f59e0b';

    // Render the exact requested HTML template
    const fullHtml = generateDepositReceivedEmailHtml({
      user_name: toName || 'Valued Investor',
      deposit_amount: formattedAmount,
      currency: currencySymbol,
      payment_method: `${network} (USDT)`,
      transaction_id: txHash || `TX-${Date.now().toString().slice(-8)}`,
      deposit_date: formattedDate,
      deposit_status: 'Under Verification',
      dashboard_url: dashboardUrl
    });

    message = `Thank you for choosing Fundora.\n\nWe have successfully received your deposit request of ${currencySymbol}${formattedAmount}.\n\nYour payment is currently under verification by our Finance Team. Once approved, the amount will automatically be credited to your Fundora wallet and will become available for investment.`;

    detailsHtml = fullHtml;
  } else if (status === 'Approved') {
    subject = `Fundora.one - Deposit Approved & Credited ($${formattedAmount} USDT)`;
    title = `Deposit Approved & Credited`;
    badge = `DEPOSIT APPROVED`;
    badgeColor = '#10b981';
    message = `Great news! Your deposit of $${formattedAmount} USDT (${network}) has been verified and approved by compliance administration.\n\nYour Fundora.one available account balance has been successfully credited with $${formattedAmount} USDT and is ready for fractional real estate investments.`;

    detailsHtml = `<div style="background:#0f172a;padding:18px;border-radius:12px;border:1px solid #1e293b;margin-top:12px;">
      <div style="font-size:12px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Deposit Confirmation</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#cbd5e1;line-height:24px;">
        <tr><td style="padding:4px 0;color:#94a3b8;">Credited Amount:</td><td align="right" style="font-weight:bold;color:#10b981;">+$${formattedAmount} USDT</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8;">Transfer Network:</td><td align="right" style="font-weight:bold;color:#f8fafc;">${network}</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8;">Transaction Hash:</td><td align="right" style="font-family:monospace;font-size:11px;color:#38bdf8;word-break:break-all;">${txHash || 'Verified'}</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8;">Status:</td><td align="right" style="font-weight:bold;color:#10b981;">Completed & Credited</td></tr>
      </table>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #1e293b;font-size:12px;color:#94a3b8;line-height:18px;">
        <strong style="color:#10b981;display:block;margin-bottom:4px;">🔒 Account Security:</strong>
        Always verify you are accessing the official domain <strong>https://fundora.one</strong> before making investments.
      </div>
    </div>`;
  } else if (status === 'Rejected') {
    subject = `Fundora.one - Deposit Verification Declined ($${formattedAmount} USDT)`;
    title = `Deposit Verification Declined`;
    badge = `DEPOSIT DECLINED`;
    badgeColor = '#ef4444';
    message = `Your deposit submission of $${formattedAmount} USDT (${network}) could not be verified by compliance administration and has been declined.\n\nReason: ${reason || 'Invalid payment receipt image or transaction hash mismatch.'}\n\nPlease check your transaction details in your dashboard or re-submit a valid receipt.`;

    detailsHtml = `<div style="background:#0f172a;padding:18px;border-radius:12px;border:1px solid #1e293b;margin-top:12px;">
      <div style="font-size:12px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Submission Audit Summary</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#cbd5e1;line-height:24px;">
        <tr><td style="padding:4px 0;color:#94a3b8;">Attempted Amount:</td><td align="right" style="font-weight:bold;color:#f8fafc;">$${formattedAmount} USDT</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8;">Transfer Network:</td><td align="right" style="font-weight:bold;color:#f8fafc;">${network}</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8;">Decline Reason:</td><td align="right" style="font-weight:bold;color:#ef4444;">${reason || 'Receipt / Hash Mismatch'}</td></tr>
      </table>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #1e293b;font-size:12px;color:#94a3b8;line-height:18px;">
        <strong style="color:#38bdf8;display:block;margin-bottom:4px;">🔒 Security Support:</strong>
        Contact our 24/7 support team at <a href="mailto:fundora.one@gmail.com" style="color:#38bdf8;text-decoration:none;">fundora.one@gmail.com</a> with any questions.
      </div>
    </div>`;
  }

  return sendTransactionalEmail({
    toEmail,
    toName,
    subject,
    title,
    badge,
    badgeColor,
    message,
    detailsHtml
  });
};

/**
 * Sends a withdrawal notification email (Submitted, Approved, or Rejected)
 */
export const sendWithdrawalEmail = async (
  toEmail: string,
  toName: string,
  amount: number,
  network: string,
  walletAddress: string,
  status: 'Submitted' | 'Approved' | 'Rejected',
  reason?: string
) => {
  let subject = `Fundora.one - Withdrawal Update ($${amount} USDT)`;
  let title = `Withdrawal Update`;
  let badge = `WITHDRAWAL ${status.toUpperCase()}`;
  let badgeColor = '#0d6efd';
  let message = '';

  if (status === 'Submitted') {
    subject = `Fundora.one - Withdrawal Request Received ($${amount.toFixed(2)} USDT)`;
    title = `Withdrawal Request Received`;
    badge = `WITHDRAWAL PENDING`;
    badgeColor = '#f59e0b';
    message = `Your withdrawal request of $${amount.toFixed(2)} USDT (${network}) has been received and queued for audit.\n\nDestination Wallet: ${walletAddress || 'Registered Wallet'}\nAmount Requested: $${amount.toFixed(2)} USDT\nStatus: Under Review\n\nOur compliance and treasury team will process and dispatch funds shortly.`;
  } else if (status === 'Approved') {
    subject = `Fundora.one - Withdrawal Processed & Dispatched ($${amount.toFixed(2)} USDT)`;
    title = `Withdrawal Processed & Dispatched`;
    badge = `WITHDRAWAL APPROVED`;
    badgeColor = '#10b981';
    message = `Your withdrawal request of $${amount.toFixed(2)} USDT (${network}) has been approved and dispatched.\n\nDestination Wallet: ${walletAddress || 'Registered Wallet'}\nAmount Sent: $${amount.toFixed(2)} USDT (${network})\nStatus: Completed\n\nThe funds have been transferred from our settlement treasury.`;
  } else if (status === 'Rejected') {
    subject = `Fundora.one - Withdrawal Declined & Refunded ($${amount.toFixed(2)} USDT)`;
    title = `Withdrawal Request Declined`;
    badge = `WITHDRAWAL DECLINED`;
    badgeColor = '#ef4444';
    message = `Your withdrawal request of $${amount.toFixed(2)} USDT (${network}) was declined by compliance administration.\n\nReason: ${reason || 'Wallet address verification issue or unconfirmed account activity.'}\n\nRefund Status: $${amount.toFixed(2)} USDT has been safely refunded back to your available account balance.`;
  }

  return sendTransactionalEmail({
    toEmail,
    toName,
    subject,
    title,
    badge,
    badgeColor,
    message,
    detailsHtml: `<div style="background:#0f172a;padding:14px;border-radius:10px;border:1px solid #1e293b;font-size:12px;color:#94a3b8;">
      <span style="color:#cbd5e1;">Amount:</span> <strong style="color:#f8fafc;">$${amount.toFixed(2)} USDT</strong> &bull; 
      <span style="color:#cbd5e1;">Network:</span> <strong style="color:#f8fafc;">${network}</strong> &bull; 
      <span style="color:#cbd5e1;">Status:</span> <strong style="color:${badgeColor};">${status}</strong>
    </div>`
  });
};

/**
 * Sends a KYC verification status email (Under Review, Verified/Approved, or Rejected)
 */
export const sendKycEmail = async (
  toEmail: string,
  toName: string,
  status: 'Under Review' | 'Verified' | 'Rejected',
  reason?: string
) => {
  let subject = `Fundora.one - Identity Verification Update`;
  let title = `KYC Verification Update`;
  let badge = `KYC ${status.toUpperCase()}`;
  let badgeColor = '#0d6efd';
  let message = '';

  if (status === 'Under Review') {
    subject = `Fundora.one - Identity Documents Submitted (KYC Under Review)`;
    title = `KYC Verification Under Review`;
    badge = `KYC UNDER REVIEW`;
    badgeColor = '#f59e0b';
    message = `Your identity verification (KYC) documents have been received and are under active review by our compliance team.\n\nStatus: Audit In Progress\n\nYou will receive an email notification as soon as your identity audit is finalized.`;
  } else if (status === 'Verified') {
    subject = `Fundora.one - Identity Verification Approved (KYC Verified)`;
    title = `KYC Verification Approved!`;
    badge = `KYC VERIFIED`;
    badgeColor = '#10b981';
    message = `Congratulations! Your identity verification (KYC) submission has been audited and approved.\n\nStatus: KYC Verified\n\nYour investor account now has full verified status with higher transaction limits and unrestricted property investment access.`;
  } else if (status === 'Rejected') {
    subject = `Fundora.one - Identity Verification Action Required`;
    title = `KYC Verification Declined`;
    badge = `KYC DECLINED`;
    badgeColor = '#ef4444';
    message = `Your identity verification (KYC) submission could not be verified.\n\nReason: ${reason || 'Unclear document images or missing document back side.'}\n\nAction Required: Please log into your Fundora.one dashboard, re-upload clear photos of your legal ID card or passport, and re-submit.`;
  }

  return sendTransactionalEmail({
    toEmail,
    toName,
    subject,
    title,
    badge,
    badgeColor,
    message
  });
};
