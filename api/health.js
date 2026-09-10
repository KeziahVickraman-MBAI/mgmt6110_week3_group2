// /api/health.js - Serverless function to report service health
// Sibling of package.json at api/ in the project root

let cachedLastGoodFetch = null;

// Format ISO string with Singapore time offset (+08:00)
function getSingaporeIsoString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const sgt = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const YYYY = sgt.getUTCFullYear();
  const MM = pad(sgt.getUTCMonth() + 1);
  const DD = pad(sgt.getUTCDate());
  const hh = pad(sgt.getUTCHours());
  const mm = pad(sgt.getUTCMinutes());
  const ss = pad(sgt.getUTCSeconds());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}+08:00`;
}

// Thoroughly clean and sanitize the LTA key
function sanitizeAccountKey(raw) {
  if (!raw || typeof raw !== 'string') {
    return { key: '', rawLength: 0, sanitizedLength: 0, hasPrefix: false, preview: '' };
  }
  const rawLength = raw.length;
  // Remove zero-width characters, BOM, non-breaking space, newlines
  let cleaned = raw.replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, '').trim();
  // Strip outer quotes
  cleaned = cleaned.replace(/^["'“”‘’]|["'“”‘’]$/g, '').trim();
  // Check for common accidental prefixes like "AccountKey: <key>", "Key=<key>"
  const hasPrefix = /^(?:AccountKey|Account_Key|API_Key|Key|Token|Bearer)\s*[:=]\s*/i.test(cleaned);
  cleaned = cleaned.replace(/^(?:AccountKey|Account_Key|API_Key|Key|Token|Bearer)\s*[:=]\s*/i, '').trim();
  cleaned = cleaned.replace(/^["'“”‘’]|["'“”‘’]$/g, '').trim();

  const preview = cleaned.length > 6
    ? `${cleaned.slice(0, 3)}***${cleaned.slice(-3)}`
    : (cleaned ? '***' : '');

  return {
    key: cleaned,
    rawLength,
    sanitizedLength: cleaned.length,
    hasPrefix,
    preview,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  const nowIso = getSingaporeIsoString();
  const rawKey = process.env.LTA_ACCOUNT_KEY;
  const keyInfo = sanitizeAccountKey(rawKey);
  const keyConfigured = Boolean(keyInfo.key && keyInfo.key.length > 0);

  // If key is not configured, report failure immediately with 503
  if (!keyConfigured) {
    res.statusCode = 503;
    return res.end(
      JSON.stringify({
        status: 'fail',
        time: nowIso,
        checks: {
          keyConfigured: false,
          keyDetails: {
            configured: false,
            rawLength: keyInfo.rawLength,
            sanitizedLength: keyInfo.sanitizedLength,
          },
          upstream: { status: 'fail', httpCode: null, ms: 0, endpoint: null },
          lastGoodFetch: cachedLastGoodFetch,
        },
      })
    );
  }

  const startTime = Date.now();
  const endpointsToTry = [
    'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=04121',
    'https://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=04121',
  ];

  let lastStatus = 500;
  let successEndpoint = null;

  for (const endpoint of endpointsToTry) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          AccountKey: keyInfo.key,
          accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SGTransitApp/1.0',
        },
      });

      lastStatus = response.status;
      if (response.status === 200) {
        successEndpoint = endpoint;
        break;
      }
    } catch {
      // Continue to next endpoint if network or timeout
    }
  }

  const elapsedMs = Date.now() - startTime;
  const isSuccess = successEndpoint !== null;

  if (isSuccess) {
    cachedLastGoodFetch = nowIso;
    res.statusCode = 200;
    return res.end(
      JSON.stringify({
        status: 'pass',
        time: nowIso,
        checks: {
          keyConfigured: true,
          keyDetails: {
            configured: true,
            length: keyInfo.sanitizedLength,
            preview: keyInfo.preview,
            hasPrefixRemoved: keyInfo.hasPrefix,
          },
          upstream: {
            status: 'pass',
            httpCode: 200,
            endpoint: successEndpoint,
            ms: elapsedMs,
          },
          lastGoodFetch: cachedLastGoodFetch,
        },
      })
    );
  } else {
    res.statusCode = 503;
    return res.end(
      JSON.stringify({
        status: 'fail',
        time: nowIso,
        checks: {
          keyConfigured: true,
          keyDetails: {
            configured: true,
            length: keyInfo.sanitizedLength,
            preview: keyInfo.preview,
            hasPrefixRemoved: keyInfo.hasPrefix,
          },
          upstream: {
            status: 'fail',
            httpCode: lastStatus,
            endpointsTested: endpointsToTry,
            ms: elapsedMs,
          },
          lastGoodFetch: cachedLastGoodFetch,
        },
      })
    );
  }
}
