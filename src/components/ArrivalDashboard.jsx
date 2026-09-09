import {
  Accessibility,
  ArrowLeft,
  Bus,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function ArrivalDashboard({
  busStops,
  selectedStopCode,
  onSelectStop,
  onUpdateTimes,
  lastUpdatedTime,
  onNavigateToSearch,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [countdown, setCountdown] = useState(20);
  const [justUpdated, setJustUpdated] = useState(false);

  // Active stop
  const activeStop = useMemo(() => {
    return (
      busStops.find((s) => s.code === selectedStopCode) ||
      busStops[0]
    );
  }, [busStops, selectedStopCode]);

  // Handle manual update
  const handleUpdate = () => {
    setIsRefreshing(true);
    setJustUpdated(true);
    onUpdateTimes();
    setCountdown(20);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
    setTimeout(() => {
      setJustUpdated(false);
    }, 3000);
  };

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onUpdateTimes();
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 2500);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, onUpdateTimes]);

  // Calculated stats
  const nextArrivingBus = useMemo(() => {
    if (!activeStop || !activeStop.buses.length) return null;
    return [...activeStop.buses].sort((a, b) => a.etaMinutes - b.etaMinutes)[0];
  }, [activeStop]);

  const getLoadBadge = (statusCode, label) => {
    switch (statusCode) {
      case 'green':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Seats
          </span>
        );
      case 'amber':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Standing
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Crowded
          </span>
        );
      default:
        return null;
    }
  };

  if (!activeStop) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-zinc-500">
        No bus stops loaded. Please switch to Search & Status to input bus stop details.
      </div>
    );
  }

  return (
    <section id="arrival-dashboard-screen" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Navigation back and header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <button
            id="btn-back-to-search"
            type="button"
            onClick={onNavigateToSearch}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Bus Stop Search & Input</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-zinc-900 text-white font-mono text-sm font-semibold rounded-lg">
              #{activeStop.code}
            </span>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              {activeStop.name}
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            <span>{activeStop.road}</span>
          </p>
        </div>

        {/* Action toolbar: Update button, Auto-refresh toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-lg text-xs text-zinc-600 border border-zinc-200">
            <input
              id="toggle-auto-refresh"
              type="checkbox"
              checked={autoRefreshEnabled}
              onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300 cursor-pointer"
            />
            <label htmlFor="toggle-auto-refresh" className="cursor-pointer select-none">
              Auto-update ({autoRefreshEnabled ? `${countdown}s` : 'Off'})
            </label>
          </div>

          {/* Trigger update button */}
          <button
            id="btn-update-eta"
            type="button"
            onClick={handleUpdate}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-colors shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>{isRefreshing ? 'Updating ETA...' : 'Get New ETA'}</span>
          </button>
        </div>
      </div>

      {/* Stop Switcher Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <span className="text-xs font-medium text-zinc-400 shrink-0 mr-1">
          Stop Switcher:
        </span>
        {busStops.map((stop) => {
          const isSelected = stop.code === activeStop.code;
          return (
            <button
              id={`dash-stop-pill-${stop.code}`}
              key={stop.code}
              type="button"
              onClick={() => onSelectStop(stop.code)}
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isSelected
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <span className="font-mono">#{stop.code}</span>
              <span className="truncate max-w-[130px]">{stop.name}</span>
            </button>
          );
        })}
      </div>

      {/* When it worked banner: The new ETA announcement */}
      {justUpdated && (
        <div
          id="eta-updated-toast"
          className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 transition-all shadow-xs"
        >
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>New ETA calculated for all {activeStop.buses.length} bus services at this stop!</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700">
            Updated at {lastUpdatedTime}
          </span>
        </div>
      )}

      {/* Summary Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-zinc-500 block mb-1">
            Earliest Arrival
          </span>
          {nextArrivingBus ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600">
                {nextArrivingBus.etaMinutes <= 0
                  ? 'Arriving'
                  : `${nextArrivingBus.etaMinutes} mins`}
              </span>
              <span className="text-xs font-medium text-zinc-600">
                (Bus {nextArrivingBus.serviceNo})
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium text-zinc-400">N/A</span>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-zinc-500 block mb-1">
            Active Routes at Stop
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-900">
              {activeStop.buses.length}
            </span>
            <span className="text-xs text-zinc-500">services monitored</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-zinc-500 block mb-1">
            System Synchronization
          </span>
          <div className="flex items-center gap-1.5 text-zinc-700">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium font-mono">
              {lastUpdatedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard of the various bus arrival times */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
          Arrival Times by Bus Service
        </h3>
        <span className="text-xs text-zinc-400">
          ETAs shown in minutes
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeStop.buses.map((bus) => {
          return (
            <div
              id={`dash-bus-card-${bus.serviceNo}`}
              key={bus.serviceNo}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                justUpdated ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-zinc-200'
              }`}
            >
              {/* Card Header: Service number & Destination */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg font-mono">
                    {bus.serviceNo}
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Destination</div>
                    <div className="text-sm font-semibold text-zinc-900 leading-tight">
                      {bus.destination}
                    </div>
                  </div>
                </div>

                {/* Bus attributes */}
                <div className="flex flex-col items-end gap-1 text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded">
                    <Layers className="w-3 h-3 text-zinc-400" />
                    {bus.type}
                  </span>
                  {bus.wheelchair && (
                    <span className="inline-flex items-center gap-1 text-zinc-600 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
                      <Accessibility className="w-3 h-3 text-zinc-400" />
                      WAB
                    </span>
                  )}
                </div>
              </div>

              {/* Arrival Times Trio: Next Bus, 2nd Bus, 3rd Bus */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-center">
                {/* Next Bus */}
                <div className="border-r border-zinc-200 pr-1">
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                    Next Bus
                  </span>
                  <div className="text-lg font-bold font-mono text-zinc-900">
                    {bus.etaMinutes <= 0 ? (
                      <span className="text-emerald-600">Arr</span>
                    ) : (
                      <span>{bus.etaMinutes} <span className="text-xs font-normal text-zinc-500">m</span></span>
                    )}
                  </div>
                  <div className="mt-1 flex justify-center">
                    {getLoadBadge(bus.statusCode, bus.status)}
                  </div>
                </div>

                {/* Subsequent Bus */}
                <div className="border-r border-zinc-200 px-1">
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                    2nd Bus
                  </span>
                  <div className="text-lg font-bold font-mono text-zinc-700">
                    {bus.subsequentEta} <span className="text-xs font-normal text-zinc-500">m</span>
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500">
                    Scheduled
                  </div>
                </div>

                {/* 3rd Bus */}
                <div className="pl-1">
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                    3rd Bus
                  </span>
                  <div className="text-lg font-bold font-mono text-zinc-500">
                    {bus.thirdEta} <span className="text-xs font-normal text-zinc-400">m</span>
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-400">
                    Follow-on
                  </div>
                </div>
              </div>

              {/* Status footer for this bus */}
              <div className="mt-3.5 flex items-center justify-between text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      bus.statusCode === 'green'
                        ? 'bg-emerald-500'
                        : bus.statusCode === 'amber'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                  <span>{bus.status}</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  ETA in mins
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
