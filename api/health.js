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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  const nowIso = getSingaporeIsoString();
  const accountKey = process.env.LTA_ACCOUNT_KEY;
  const keyConfigured = Boolean(accountKey && accountKey.trim().length > 0);

  // If key is not configured, report failure immediately with 503
  if (!keyConfigured) {
    res.statusCode = 503;
    return res.end(
      JSON.stringify({
        status: 'fail',
        time: nowIso,
        checks: {
          keyConfigured: false,
          upstream: { status: 'fail', httpCode: null, ms: 0 },
          lastGoodFetch: cachedLastGoodFetch,
        },
      })
    );
  }

  const startTime = Date.now();

  try {
    const ltaEndpoint =
      'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=04121';

    const upstreamResponse = await fetch(ltaEndpoint, {
      method: 'GET',
      headers: {
        AccountKey: accountKey,
        accept: 'application/json',
      },
    });

    const elapsedMs = Date.now() - startTime;
    const isSuccess = upstreamResponse.status === 200;

    if (isSuccess) {
      cachedLastGoodFetch = nowIso;
      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          status: 'pass',
          time: nowIso,
          checks: {
            keyConfigured: true,
            upstream: {
              status: 'pass',
              httpCode: 200,
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
            upstream: {
              status: 'fail',
              httpCode: upstreamResponse.status,
              ms: elapsedMs,
            },
            lastGoodFetch: cachedLastGoodFetch,
          },
        })
      );
    }
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    res.statusCode = 503;
    return res.end(
      JSON.stringify({
        status: 'fail',
        time: nowIso,
        checks: {
          keyConfigured: true,
          upstream: {
            status: 'fail',
            httpCode: null,
            ms: elapsedMs,
          },
          lastGoodFetch: cachedLastGoodFetch,
        },
      })
    );
  }
}
