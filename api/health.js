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

// Generate candidate keys including base64 padding repair
function getCandidateKeys(raw) {
  const info = sanitizeAccountKey(raw);
  if (!info.key) return [];

  const candidates = [info.key];

  // In LTA DataMall, 16-byte keys base64-encoded are exactly 24 characters ending in '=='
  // Double-clicking in many email clients/browsers truncates trailing punctuation '=='
  // If length % 4 === 2 (e.g. 22 chars), appending '==' repairs base64 padding
  if (!info.key.endsWith('==') && info.key.length % 4 === 2) {
    candidates.push(info.key + '==');
  } else if (!info.key.endsWith('=') && info.key.length % 4 === 3) {
    candidates.push(info.key + '=');
  } else if (info.key.endsWith('==')) {
    candidates.push(info.key.slice(0, -2));
  }

  return Array.from(new Set(candidates)).map((k) => ({
    key: k,
    length: k.length,
    preview: k.length > 6 ? `${k.slice(0, 3)}***${k.slice(-3)}` : k,
  }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  const nowIso = getSingaporeIsoString();
  const rawKey = process.env.LTA_ACCOUNT_KEY;
  const keyInfo = sanitizeAccountKey(rawKey);
  const candidates = getCandidateKeys(rawKey);
  const keyConfigured = candidates.length > 0;

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
  const endpoint = 'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=04121';

  let workingCandidate = null;
  const attempts = [];

  for (const candidate of candidates) {
    const attemptStart = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          AccountKey: candidate.key,
          accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SGTransitApp/1.0',
        },
      });

      const attemptMs = Date.now() - attemptStart;
      attempts.push({
        keyPreview: candidate.preview,
        length: candidate.length,
        httpCode: response.status,
        ms: attemptMs,
      });

      if (response.status === 200) {
        workingCandidate = candidate;
        break;
      }
    } catch (err) {
      attempts.push({
        keyPreview: candidate.preview,
        length: candidate.length,
        httpCode: null,
        error: err.message,
        ms: Date.now() - attemptStart,
      });
    }
  }

  const elapsedMs = Date.now() - startTime;
  const isSuccess = workingCandidate !== null;

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
            length: workingCandidate.length,
            preview: workingCandidate.preview,
            hasPrefixRemoved: keyInfo.hasPrefix,
            autoPadded: workingCandidate.key !== keyInfo.key,
          },
          upstream: {
            status: 'pass',
            httpCode: 200,
            endpoint,
            ms: elapsedMs,
          },
          attempts,
          lastGoodFetch: cachedLastGoodFetch,
        },
      })
    );
  } else {
    const primaryAttempt = attempts[0] || {};
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
            note: keyInfo.sanitizedLength === 22 ? 'Standard LTA Base64 keys are 24 characters ending in ==. Both raw (22) and padded (24) were tested.' : undefined,
          },
          upstream: {
            status: 'fail',
            httpCode: primaryAttempt.httpCode || 401,
            endpoint,
            ms: elapsedMs,
          },
          attempts,
          lastGoodFetch: cachedLastGoodFetch,
        },
      })
    );
  }
}
