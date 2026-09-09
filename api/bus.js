// /api/bus.js - Serverless function for LTA Bus Arrival Times
// Sibling of package.json at api/ in the project root

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
  const accountKey = typeof rawKey === 'string' ? rawKey.trim().replace(/^["']|["']$/g, '') : '';

  // Handle missing key without crashing or logging credential
  if (!accountKey) {
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
    const ltaEndpoint = `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${encodeURIComponent(
      busStopCode
    )}`;

    const upstreamResponse = await fetch(ltaEndpoint, {
      method: 'GET',
      headers: {
        AccountKey: accountKey,
        accept: 'application/json',
      },
    });

    if (!upstreamResponse.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = upstreamResponse.status || 502;
      return res.end(
        JSON.stringify({
          error: `LTA DataMall responded with HTTP ${upstreamResponse.status}`,
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
