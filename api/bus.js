// /api/bus.js - Serverless function for LTA Bus Arrival Times
// Sibling of package.json at api/ in the project root

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

  return Array.from(new Set(candidates));
}

export default async function handler(req, res) {
  // LTA DataMall Bus Arrival data refreshes every 20 seconds
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  // Accept BusStopCode query parameter, defaults to '04121'
  let busStopCode = '04121';
  if (req.query && req.query.BusStopCode) {
    busStopCode = String(req.query.BusStopCode).trim();
  } else if (req.url) {
    try {
      const host = req.headers?.host || 'localhost';
      const parsedUrl = new URL(req.url, `http://${host}`);
      const code = parsedUrl.searchParams.get('BusStopCode');
      if (code && code.trim()) {
        busStopCode = code.trim();
      }
    } catch {
      // keep default
    }
  }

  const rawKey = process.env.LTA_ACCOUNT_KEY;
  const keyInfo = sanitizeAccountKey(rawKey);
  const candidates = getCandidateKeys(rawKey);

  // Handle missing key without crashing or logging credential
  if (candidates.length === 0) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 503;
    return res.end(
      JSON.stringify({
        error: 'LTA_ACCOUNT_KEY is not configured in server environment.',
        message: 'No buses running (Credential not configured)',
        services: [],
      })
    );
  }

  try {
    const encodedCode = encodeURIComponent(busStopCode);
    const endpoint = `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${encodedCode}`;

    let upstreamResponse = null;
    let lastStatus = 500;

    for (const key of candidates) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            AccountKey: key,
            accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SGTransitApp/1.0',
          },
        });
        lastStatus = response.status;
        if (response.ok) {
          upstreamResponse = response;
          break;
        }
      } catch {
        // Continue to next candidate
      }
    }

    if (!upstreamResponse || !upstreamResponse.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = lastStatus || 502;
      return res.end(
        JSON.stringify({
          error: `LTA DataMall responded with HTTP ${lastStatus}`,
          keyConfigured: true,
          keyLength: keyInfo.sanitizedLength,
          services: [],
        })
      );
    }

    const data = await upstreamResponse.json();

    // Helper to calculate minutes until arrival from EstimatedArrival timestamp
    const getMinutes = (estimatedArrival) => {
      if (!estimatedArrival || typeof estimatedArrival !== 'string') {
        return null;
      }
      const targetTime = new Date(estimatedArrival).getTime();
      if (isNaN(targetTime)) {
        return null;
      }
      const diffMs = targetTime - Date.now();
      const minutes = Math.floor(diffMs / 60000);
      return minutes < 0 ? 0 : minutes;
    };

    // Handle an empty Services array as "no buses running", not as an error
    const rawServices = Array.isArray(data?.Services) ? data.Services : [];

    // Return simplified list: for each service, the ServiceNo and the minutes until each of the next two buses
    const simplifiedList = rawServices.map((srv) => {
      const nextBusMinutes = getMinutes(srv.NextBus?.EstimatedArrival);
      const nextBus2Minutes = getMinutes(srv.NextBus2?.EstimatedArrival);

      return {
        ServiceNo: srv.ServiceNo,
        nextBusMinutes,
        nextBus2Minutes,
        nextBus: nextBusMinutes,
        nextBus2: nextBus2Minutes,
        hasBusesRunning: nextBusMinutes !== null || nextBus2Minutes !== null,
      };
    });

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify(simplifiedList));
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    return res.end(
      JSON.stringify({
        error: 'Failed to communicate with LTA DataMall upstream',
        services: [],
      })
    );
  }
}
