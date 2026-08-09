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

  // 3. Fallback: Inspect browser / hybrid container context
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin || '';
    const host = window.location.host || '';

    // Check Capacitor or native platform bridge
    const isCapacitor = !!((window as any).Capacitor && (
      (window as any).Capacitor.isNative || 
      ((window as any).Capacitor.getPlatform && (window as any).Capacitor.getPlatform() !== 'web')
    ));
    
    // Check local protocols/schemas
    const isLocalFile = origin.startsWith('file:') || origin.startsWith('capacitor:') || origin.startsWith('app:') || origin.startsWith('ionic:');
    
    // Detect mobile/local WebViews that run on localhost but are NOT actual developer instances.
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
    const isWebViewLocalhost = isLocalHost && !isDev;

    // Detect fundora.one static web host or mobile APK environments
    const isFundoraStaticDomain = origin.includes('fundora.one') || host.includes('fundora.one');
    const isNativeOrHybrid = isCapacitor || isLocalFile || isWebViewLocalhost || isFundoraStaticDomain;

    // Only use origin as API base URL if we are running in AI Studio Cloud Run container directly (ais-dev or ais-pre)
    // AND NOT on fundora.one static site or mobile APK app!
    if (!isNativeOrHybrid && origin.startsWith('http') && !isLocalHost) {
      if (origin.includes('ais-dev-') || origin.includes('ais-pre-') || origin.includes('run.app')) {
        localStorage.setItem('inv_last_known_web_origin', origin);
        return `${origin}${formattedPath}`;
      }
    }
  }

  // 4. Default fallback to Cloud Run Backend (which has active Express server.ts & Resend API key)
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

    // If status is not OK OR if response is HTML (meaning host served static index.html SPA fallback instead of real API JSON)
    if (!response.ok || isHtmlResponse) {
      console.warn(`[API Proxy] Primary URL (${primaryUrl}) returned invalid response (status: ${response.status}, contentType: ${contentType}). Trying Cloud Run backend failover...`);
      throw new Error(`Endpoint returned invalid response (status: ${response.status}, contentType: ${contentType})`);
    }

    return response;
  } catch (err: any) {
    console.warn(`[API Proxy] Primary URL (${primaryUrl}) failed: ${err.message || err}. Initiating smart failover to Cloud Run backends...`);

    const fallbackTargets = [
      `${CLOUD_RUN_PRE_URL}${formattedPath}`,
      `${CLOUD_RUN_DEV_URL}${formattedPath}`
    ].filter(url => url !== primaryUrl);

    for (const targetUrl of fallbackTargets) {
      try {
        console.log(`[API Proxy] Failover fetch attempt to: ${targetUrl}`);
        const fbRes = await fetch(targetUrl, options);
        const fbContentType = fbRes.headers.get("content-type") || "";
        
        if (fbRes.ok && !fbContentType.includes("text/html")) {
          console.log(`[API Proxy] Failover to ${targetUrl} succeeded!`);
          return fbRes;
        }
      } catch (fbErr: any) {
        console.warn(`[API Proxy] Failover to ${targetUrl} failed:`, fbErr?.message || fbErr);
      }
    }

    throw err;
  }
};

