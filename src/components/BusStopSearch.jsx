import {
  Accessibility,
  ArrowRight,
  Bus,
  CheckCircle2,
  Clock,
  Layers,
  PlusCircle,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export default function BusStopSearch({
  busStops,
  selectedStopCode,
  onSelectStop,
  onAddBusStop,
  onUpdateTimes,
  lastUpdatedTime,
  onNavigateToDashboard,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStopCode, setNewStopCode] = useState('');
  const [newStopName, setNewStopName] = useState('');
  const [newStopRoad, setNewStopRoad] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter stops by query (search by bus stop code or name)
  const filteredStops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return busStops;
    return busStops.filter(
      (stop) =>
        stop.code.toLowerCase().includes(q) ||
        stop.name.toLowerCase().includes(q) ||
        stop.road.toLowerCase().includes(q)
    );
  }, [busStops, searchQuery]);

  // Selected stop object
  const activeStop = useMemo(() => {
    return (
      busStops.find((s) => s.code === selectedStopCode) ||
      filteredStops[0] ||
      busStops[0]
    );
  }, [busStops, selectedStopCode, filteredStops]);

  // Form submit for adding bus stop details
  const handleAddStopSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const trimmedCode = newStopCode.trim();
    const trimmedName = newStopName.trim();
    const trimmedRoad = newStopRoad.trim() || 'Singapore Road';

    if (!trimmedCode || !trimmedName) {
      setFormError('Please input both bus stop number and name.');
      return;
    }

    if (!/^\d{4,5}$/.test(trimmedCode)) {
      setFormError('Bus stop number should be 4 or 5 digits (e.g. 03218).');
      return;
    }

    const exists = busStops.some((s) => s.code === trimmedCode);
    if (exists) {
      setFormError(`Bus stop #${trimmedCode} already exists in the list.`);
      return;
    }

    const createdStop = onAddBusStop({
      code: trimmedCode,
      name: trimmedName,
      road: trimmedRoad,
    });

    setFormSuccess(`Bus stop #${trimmedCode} (${trimmedName}) added successfully!`);
    setNewStopCode('');
    setNewStopName('');
    setNewStopRoad('');
    setTimeout(() => {
      setShowAddForm(false);
      setFormSuccess('');
    }, 1800);
  };

  const handleTriggerUpdate = () => {
    setIsUpdating(true);
    onUpdateTimes();
    setTimeout(() => setIsUpdating(false), 500);
  };

  const getStatusBadge = (statusCode, label) => {
    switch (statusCode) {
      case 'green':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {label}
          </span>
        );
      case 'amber':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {label}
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
            {label}
          </span>
        );
    }
  };

  return (
    <section id="bus-search-screen" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top action row: Search input & Add details toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        {/* Search bar */}
        <div className="relative flex-1">
          <label htmlFor="bus-stop-search-input" className="sr-only">
            Search bus stop code or name
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              id="bus-stop-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by 5-digit stop code (e.g. 08057) or stop name..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Action button to open Input Bus Stop Details form */}
        <button
          id="btn-toggle-add-stop"
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showAddForm ? 'Close Stop Form' : 'Input Bus Stop Details'}</span>
        </button>
      </div>

      {/* Input Bus Stop Details Form */}
      {showAddForm && (
        <div id="add-bus-stop-section" className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 sm:p-6 mb-8 transition-all">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Input Bus Stop Details
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Register a bus stop by entering its stop number and name to receive updates on arrival times.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-zinc-400 hover:text-zinc-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAddStopSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="input-stop-number"
                  className="block text-xs font-medium text-zinc-700 mb-1.5"
                >
                  Stop Number (5 digits)*
                </label>
                <input
                  id="input-stop-number"
                  type="text"
                  maxLength={5}
                  value={newStopCode}
                  onChange={(e) => setNewStopCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 11401"
                  className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="input-stop-name"
                  className="block text-xs font-medium text-zinc-700 mb-1.5"
                >
                  Bus Stop Name*
                </label>
                <input
                  id="input-stop-name"
                  type="text"
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  placeholder="e.g. Central Square Walk"
                  className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="input-stop-road"
                  className="block text-xs font-medium text-zinc-700 mb-1.5"
                >
                  Road / Area (Optional)
                </label>
                <input
                  id="input-stop-road"
                  type="text"
                  value={newStopRoad}
                  onChange={(e) => setNewStopRoad(e.target.value)}
                  placeholder="e.g. Havelock Road"
                  className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-rose-600 font-medium">{formError}</p>
            )}
            {formSuccess && (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {formSuccess}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                id="btn-submit-stop-details"
                type="submit"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Save Bus Stop Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Available Bus Stops Pills / Switcher */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Available Bus Stops ({filteredStops.length})
          </span>
          {searchQuery && (
            <span className="text-xs text-zinc-400">
              Filtering for &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {filteredStops.map((stop) => {
            const isSelected = activeStop && activeStop.code === stop.code;
            return (
              <button
                id={`stop-pill-${stop.code}`}
                key={stop.code}
                type="button"
                onClick={() => onSelectStop(stop.code)}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <span
                  className={`font-mono px-1.5 py-0.5 rounded text-[11px] ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-200'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {stop.code}
                </span>
                <span className="truncate max-w-[150px]">{stop.name}</span>
              </button>
            );
          })}
          {filteredStops.length === 0 && (
            <div className="text-xs text-zinc-500 py-2">
              No matching bus stops found for &ldquo;{searchQuery}&rdquo;. Try another code or click &ldquo;Input Bus Stop Details&rdquo; above.
            </div>
          )}
        </div>
      </div>

      {/* Main Bus Stop Details & Bus Status view */}
      {activeStop && (
        <div
          id="bus-stop-details-card"
          className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs"
        >
          {/* Stop Banner header */}
          <div className="p-5 sm:p-6 border-b border-zinc-200 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="px-2.5 py-1 bg-zinc-900 text-white font-mono text-xs font-semibold rounded-lg tracking-wider">
                  #{activeStop.code}
                </span>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {activeStop.name}
                </h2>
              </div>
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                <span>{activeStop.road}</span>
                <span>•</span>
                <span>{activeStop.buses.length} active bus services</span>
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                id="btn-refresh-status"
                type="button"
                onClick={handleTriggerUpdate}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:border-zinc-400 text-zinc-700 rounded-lg text-xs font-medium transition-colors shadow-2xs"
                title="Receive updates on bus arrival times"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-zinc-500 ${
                    isUpdating ? 'animate-spin text-zinc-900' : ''
                  }`}
                />
                <span>{isUpdating ? 'Updating...' : 'Update Arrival Times'}</span>
              </button>

              <button
                id="btn-goto-dashboard"
                type="button"
                onClick={() => onNavigateToDashboard(activeStop.code)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
              >
                <span>Full Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Update Confirmation Notice when it worked */}
          <div className="px-6 py-2 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Live bus status active — ETAs calculated in minutes.
              </span>
            </div>
            <div className="flex items-center gap-1 text-emerald-700 font-mono">
              <Clock className="w-3 h-3" />
              <span>Latest update: {lastUpdatedTime}</span>
            </div>
          </div>

          {/* Status of each bus table / card list */}
          <div className="divide-y divide-zinc-200">
            {activeStop.buses.map((bus) => {
              return (
                <div
                  id={`bus-row-${bus.serviceNo}`}
                  key={bus.serviceNo}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/70 transition-colors"
                >
                  {/* Bus service number & Destination */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                      <span className="font-bold text-base text-zinc-900 font-mono">
                        {bus.serviceNo}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900">
                          Bus {bus.serviceNo}
                        </span>
                        <span className="text-xs text-zinc-500">to</span>
                        <span className="text-xs font-medium text-zinc-700">
                          {bus.destination}
                        </span>
                      </div>

                      {/* Attribute pills: Deck type, Wheelchair */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="w-3 h-3 text-zinc-400" />
                          {bus.type}
                        </span>
                        {bus.wheelchair && (
                          <span className="inline-flex items-center gap-1 text-zinc-600">
                            <Accessibility className="w-3 h-3 text-zinc-500" />
                            Wheelchair accessible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status of bus and ETA: in minutes */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                    {/* Status badge */}
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] text-zinc-400 mb-1">
                        Bus Status
                      </div>
                      {getStatusBadge(bus.statusCode, bus.status)}
                    </div>

                    {/* ETA in minutes */}
                    <div className="text-right shrink-0 min-w-[90px]">
                      <div className="text-[11px] text-zinc-400 mb-1">
                        Arrival ETA
                      </div>
                      <div className="inline-flex items-baseline gap-1">
                        <span
                          className={`text-xl font-bold tracking-tight font-mono ${
                            bus.etaMinutes <= 2
                              ? 'text-emerald-600'
                              : bus.etaMinutes <= 7
                              ? 'text-zinc-900'
                              : 'text-zinc-700'
                          }`}
                        >
                          {bus.etaMinutes <= 0 ? 'Arr' : `${bus.etaMinutes}`}
                        </span>
                        <span className="text-xs font-medium text-zinc-500">
                          {bus.etaMinutes <= 0 ? '' : 'mins'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="p-4 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Status Legend: Green = Seats Available, Amber = Standing Available, Red = Limited Standing
            </span>
            <span className="text-zinc-400">
              ETAs update on manual refresh or countdown
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
