/**
 * Utility to resolve API URLs, especially for hybrid environments (e.g. mobile APKs and fundora.one static host).
 */

const CLOUD_RUN_PRE_URL = 'https://ais-pre-hb5de275kkaohqffdp2qfz-614235734610.asia-southeast1.run.app';
const CLOUD_RUN_DEV_URL = 'https://ais-dev-hb5de275kkaohqffdp2qfz-614235734610.asia-southeast1.run.app';

export const getApiUrl = (path: string): string => {
  // Ensure path starts with a slash
  const formattedPath = path.startsWith('/') ? path : `/${path}`;

  // 1. High priority: Check if there's a VITE_API_URL environment variable baked in
  const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envApiUrl) {
    return `${envApiUrl.replace(/\/$/, '')}${formattedPath}`;
  }

  // 2. High priority: Check systemSettings for a configured API URL saved in localStorage
  // This is set in the Admin Panel as 'Production Backend API URL'.
  const savedSettings = localStorage.getItem('inv_system_settings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      if (parsed.apiUrl && parsed.apiUrl.trim().length > 10 && !parsed.apiUrl.includes('fundora.one')) {
        return `${parsed.apiUrl.trim().replace(/\/$/, '')}${formattedPath}`;
      }
    } catch (_) {}
  }

  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const defaultBaseUrl = isDev ? CLOUD_RUN_DEV_URL : CLOUD_RUN_PRE_URL;

  // 3. Inspect browser / hybrid container context
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin || '';
    const protocol = window.location.protocol || '';

    // Check Capacitor or native platform bridge
    const isCapacitor = !!((window as any).Capacitor && (
      (window as any).Capacitor.isNative || 
      ((window as any).Capacitor.getPlatform && (window as any).Capacitor.getPlatform() !== 'web')
    ));
    
    // Check local file/native protocols
    const isLocalFile = protocol.startsWith('file') || protocol.startsWith('capacitor') || protocol.startsWith('app') || protocol.startsWith('ionic');

    // On standard web browsers (Vercel, Netlify, custom domain, AI Studio, Localhost), always use origin
    // so relative /api/* requests hit local Vercel serverless functions or local Express server directly.
    if (!isCapacitor && !isLocalFile && origin && (protocol === 'http:' || protocol === 'https:')) {
      localStorage.setItem('inv_last_known_web_origin', origin);
      return `${origin.replace(/\/$/, '')}${formattedPath}`;
    }
  }

  // 4. Default fallback to Cloud Run Backend for native mobile APK / local file protocol
  return `${defaultBaseUrl}${formattedPath}`;
};

export const fetchWithFallback = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const primaryUrl = getApiUrl(path);
  const formattedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    console.log(`[API Proxy] Primary fetch attempt to: ${primaryUrl}`);
    const response = await fetch(primaryUrl, options);
    
    const contentType = response.headers.get("content-type") || "";
    const isHtmlResponse = contentType.includes("text/html");

    // If server responded with non-HTML content (e.g. JSON API response), return it directly!
    // Even if status is 4xx or 5xx, caller can parse JSON error details (e.g. SendPulse error messages).
    if (!isHtmlResponse) {
      return response;
    }

    // Response is HTML SPA fallback (meaning server served index.html because endpoint doesn't exist)
    console.warn(`[API Proxy] Primary URL (${primaryUrl}) returned static HTML instead of API JSON.`);
    throw new Error(`Endpoint returned static HTML fallback.`);
  } catch (err: any) {
    console.warn(`[API Proxy] Primary URL (${primaryUrl}) failed: ${err.message || err}`);

    // Only attempt Cloud Run container failover if running inside AI Studio preview or localhost
    const isAiStudioOrLocal = typeof window !== 'undefined' && window.location && (
      window.location.origin.includes('ais-dev-') || 
      window.location.origin.includes('ais-pre-') || 
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );

    if (isAiStudioOrLocal) {
      const fallbackTargets = [
        `${CLOUD_RUN_PRE_URL}${formattedPath}`,
        `${CLOUD_RUN_DEV_URL}${formattedPath}`
      ].filter(url => url !== primaryUrl);

      for (const targetUrl of fallbackTargets) {
        try {
          console.log(`[API Proxy] Failover fetch attempt to: ${targetUrl}`);
          const fbRes = await fetch(targetUrl, options);
          const fbContentType = fbRes.headers.get("content-type") || "";
          
          if (!fbContentType.includes("text/html")) {
            console.log(`[API Proxy] Failover to ${targetUrl} succeeded!`);
            return fbRes;
          }
        } catch (fbErr: any) {
          console.warn(`[API Proxy] Failover to ${targetUrl} failed:`, fbErr?.message || fbErr);
        }
      }
    }

    throw err;
  }
};

