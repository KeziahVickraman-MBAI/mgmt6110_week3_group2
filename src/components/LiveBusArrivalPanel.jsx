import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// Fallback sample data strictly used only when the serverless API key is not yet configured in environment
const SAMPLE_PREVIEW_SERVICES = [
  {
    ServiceNo: '10',
    nextBusMinutes: 0, // < 1 minute -> "Arriving"
    nextBus2Minutes: 8,
    hasBusesRunning: true,
  },
  {
    ServiceNo: '100',
    nextBusMinutes: 3,
    nextBus2Minutes: 12,
    hasBusesRunning: true,
  },
  {
    ServiceNo: '107',
    nextBusMinutes: 7,
    nextBus2Minutes: 19,
    hasBusesRunning: true,
  },
  {
    ServiceNo: '130',
    nextBusMinutes: null,
    nextBus2Minutes: null,
    hasBusesRunning: false, // will show "No buses currently running for this service."
  },
  {
    ServiceNo: '196',
    nextBusMinutes: 11,
    nextBus2Minutes: 24,
    hasBusesRunning: true,
  },
];

export default function LiveBusArrivalPanel({
  initialStopCode = '04121',
  onNavigateToExistingScreens,
}) {
  const [busStopCode, setBusStopCode] = useState(initialStopCode);
  const [inputCode, setInputCode] = useState(initialStopCode);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedTime, setLastFetchedTime] = useState(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);
  const [healthData, setHealthData] = useState(null);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [useSampleFallback, setUseSampleFallback] = useState(false);

  const countdownIntervalRef = useRef(null);

  // Fetch /api/health to inspect key status and upstream connectivity
  const checkHealth = useCallback(async () => {
    setIsHealthChecking(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
      return data;
    } catch (err) {
      setHealthData({
        status: 'fail',
        checks: {
          keyConfigured: false,
          upstream: { status: 'fail', httpCode: null, ms: 0 },
        },
      });
      return null;
    } finally {
      setIsHealthChecking(false);
    }
  }, []);

  // Fetch /api/bus?BusStopCode=...
  const fetchBusArrivals = useCallback(
    async (codeToFetch, forceDemo = false) => {
      setIsLoading(true);
      setError(null);

      if (forceDemo) {
        setServices(SAMPLE_PREVIEW_SERVICES);
        setLastFetchedTime(new Date().toLocaleTimeString('en-SG', { hour12: true }));
        setIsLoading(false);
        return;
      }

      try {
        const url = `/api/bus?BusStopCode=${encodeURIComponent(codeToFetch || '04121')}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          // If server reports key missing (503), note it clearly
          if (res.status === 503 && data?.error?.includes('LTA_ACCOUNT_KEY')) {
            setError('LTA_ACCOUNT_KEY is not configured in Vercel environment.');
            // Offer fallback to preview simulated response
            setServices(SAMPLE_PREVIEW_SERVICES);
            setUseSampleFallback(true);
          } else {
            setError(data?.error || `Server responded with status ${res.status}`);
            setServices([]);
          }
        } else {
          // data is the simplified list of services
          const list = Array.isArray(data) ? data : data?.services || [];
          setServices(list);
          setUseSampleFallback(false);
        }

        setLastFetchedTime(new Date().toLocaleTimeString('en-SG', { hour12: true }));
      } catch (err) {
        setError('Network error reaching /api/bus endpoint.');
        setServices([]);
      } finally {
        setIsLoading(false);
        setSecondsUntilRefresh(30);
      }
    },
    []
  );

  // Initial load: check health and fetch bus arrivals
  useEffect(() => {
    checkHealth();
    fetchBusArrivals(busStopCode, false);
  }, [busStopCode, checkHealth, fetchBusArrivals]);

  // 30-second refresh interval as requested
  useEffect(() => {
    // Reset countdown
    setSecondsUntilRefresh(30);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchBusArrivals(busStopCode, useSampleFallback);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [busStopCode, fetchBusArrivals, useSampleFallback]);

  // Handle bus stop code search submit
  const handleStopSubmit = (e) => {
    e.preventDefault();
    const clean = inputCode.trim() || '04121';
    setBusStopCode(clean);
    fetchBusArrivals(clean, useSampleFallback);
  };

  const handleManualRefresh = () => {
    fetchBusArrivals(busStopCode, useSampleFallback);
    checkHealth();
  };

  // Helper to render arrival minutes or "Arriving" under one minute
  const renderArrivalBadge = (minutes, label) => {
    if (minutes === null || minutes === undefined) {
      return (
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">
            {label}
          </span>
          <span className="text-sm font-medium text-zinc-400">—</span>
        </div>
      );
    }

    // Showing "Arriving" under one minute
    const isArriving = minutes < 1;

    return (
      <div className="flex flex-col items-center">
        <span className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">
          {label}
        </span>
        {isArriving ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Arriving
          </span>
        ) : (
          <div className="inline-flex items-baseline gap-0.5">
            <span className="text-base font-bold font-mono text-zinc-900">
              {minutes}
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              {minutes === 1 ? 'min' : 'mins'}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section id="live-bus-arrival-panel" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header Card: Bus stop code selector and live sync controls */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 mb-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 text-white text-xs font-semibold font-mono">
                <Bus className="w-3.5 h-3.5" />
                Live LTA Panel
              </span>
              <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                Stop #{busStopCode}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Live Bus Arrival Times
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Real-time feed powered by serverless function <code className="text-zinc-700 font-mono">api/bus.js</code>. Refreshes every 30 seconds.
            </p>
          </div>

          {/* Form to change BusStopCode */}
          <form
            onSubmit={handleStopSubmit}
            className="flex items-center gap-2 flex-wrap"
          >
            <div className="relative">
              <label htmlFor="input-bus-stop-code" className="sr-only">
                Bus Stop Code
              </label>
              <input
                id="input-bus-stop-code"
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="04121"
                className="w-32 px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-mono font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
              />
            </div>
            <button
              id="btn-apply-bus-code"
              type="submit"
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-colors shadow-2xs"
            >
              Load Stop
            </button>

            <button
              id="btn-refresh-live-bus"
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-300 hover:border-zinc-400 text-zinc-700 rounded-xl text-xs font-medium transition-colors shadow-2xs"
              title="Refresh arrivals now"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-zinc-500 ${
                  isLoading ? 'animate-spin text-zinc-900' : ''
                }`}
              />
              <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
            </button>
          </form>
        </div>

        {/* Live Refresh Status Banner */}
        <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              Auto-refreshing in <strong className="text-zinc-900 font-mono">{secondsUntilRefresh}s</strong> (every 30 seconds)
            </span>
            {lastFetchedTime && (
              <span className="text-zinc-400 font-mono">
                • Last check: {lastFetchedTime}
              </span>
            )}
          </div>

          {/* Quick presets for common bus stops */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-zinc-400 shrink-0">Sample stops:</span>
            {['04121', '08057', '03218', '10129', '66009'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setInputCode(code);
                  setBusStopCode(code);
                  fetchBusArrivals(code, useSampleFallback);
                }}
                className={`px-2 py-0.5 rounded font-mono transition-colors ${
                  busStopCode === code
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                #{code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Backend Service Health Strip */}
      <div
        id="api-health-banner"
        className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2.5">
          <Activity
            className={`w-4 h-4 shrink-0 ${
              healthData?.status === 'pass'
                ? 'text-emerald-600'
                : healthData?.checks?.keyConfigured === false
                ? 'text-amber-600'
                : 'text-zinc-400'
            }`}
          />
          <div>
            <span className="font-semibold text-zinc-800">
              Backend Health (GET /api/health):{' '}
            </span>
            {healthData?.status === 'pass' ? (
              <span className="text-emerald-700 font-medium">
                200 OK — LTA Upstream Connected ({healthData.checks.upstream?.ms}ms)
              </span>
            ) : healthData?.checks?.keyConfigured === false ? (
              <span className="text-amber-700 font-medium">
                LTA_ACCOUNT_KEY not configured in environment (Serverless ready)
              </span>
            ) : (
              <span className="text-zinc-600">
                {isHealthChecking ? 'Checking /api/health...' : 'Service online'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {useSampleFallback && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <Info className="w-3 h-3" />
              Previewing Sample Data
            </span>
          )}
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 underline"
          >
            <span>View /api/health raw</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Bus Service Listing Panel */}
      <div
        id="services-arrival-panel"
        className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs"
      >
        {/* Panel Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
              Bus Services at Stop #{busStopCode}
            </h3>
            <span className="text-xs text-zinc-500">
              Showing next two arrivals in minutes for each operating service
            </span>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            {services.length} {services.length === 1 ? 'service' : 'services'} listed
          </div>
        </div>

        {/* Loading state */}
        {isLoading && services.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-400 mb-2" />
            <p className="text-sm">Fetching live bus arrivals from /api/bus...</p>
          </div>
        )}

        {/* Case: Entire stop has no buses running (empty services array handled as "no buses running", not an error) */}
        {!isLoading && services.length === 0 && (
          <div
            id="empty-services-message"
            className="p-12 text-center bg-zinc-50/50"
          >
            <Bus className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-base font-semibold text-zinc-700">
              No buses currently running for this bus stop.
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              The transit schedule indicates no active buses are serving Stop #{busStopCode} at this hour.
            </p>
          </div>
        )}

        {/* List of services */}
        {services.length > 0 && (
          <div className="divide-y divide-zinc-200">
            {services.map((service) => {
              const hasBuses =
                service.hasBusesRunning !== false &&
                (service.nextBusMinutes !== null || service.nextBus2Minutes !== null);

              return (
                <div
                  id={`service-row-${service.ServiceNo}`}
                  key={service.ServiceNo}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/60 transition-colors"
                >
                  {/* Left: Service No badge and name */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-mono font-bold text-lg shadow-2xs">
                      {service.ServiceNo}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">
                        Service {service.ServiceNo}
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>Next two scheduled arrivals</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Arrival times OR plain sentence when a service has no buses running */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                    {hasBuses ? (
                      <div className="flex items-center gap-8">
                        {/* Next Bus Arrival */}
                        {renderArrivalBadge(service.nextBusMinutes, 'Next Bus')}

                        {/* 2nd Bus Arrival */}
                        {renderArrivalBadge(service.nextBus2Minutes, '2nd Bus')}
                      </div>
                    ) : (
                      /* Plain sentence when a service has no buses running */
                      <div className="text-sm text-zinc-500 italic py-1">
                        No buses currently running for this service.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Panel footer note */}
        <div className="p-4 bg-zinc-50/80 border-t border-zinc-200 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Arrival times refresh automatically every 30 seconds. Arrivals under 1 minute display as &ldquo;Arriving&rdquo;.
          </span>
          <button
            type="button"
            onClick={onNavigateToExistingScreens}
            className="text-zinc-900 hover:text-zinc-700 font-medium inline-flex items-center gap-1"
          >
            <span>Explore full transit dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
