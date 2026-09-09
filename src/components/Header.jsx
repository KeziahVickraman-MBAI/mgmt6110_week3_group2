import { Bus, Clock, LayoutDashboard, Radio, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Header({ activeScreen, onSelectScreen }) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-SG', {
          timeZone: 'Asia/Singapore',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header id="app-header" className="bg-white border-b border-zinc-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
                SG Bus Arrival
              </h1>
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                Singapore Transit
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Live Arrival & Bus Status Tracker • MGMT 6110 Task
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          {currentTime && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-mono font-medium">{currentTime} SGT</span>
            </div>
          )}

          {/* Navigation via React state (No Router Library) */}
          <nav aria-label="Screen Navigation" className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              id="nav-live-screen"
              type="button"
              onClick={() => onSelectScreen('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScreen === 'live'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live Panel</span>
            </button>
            <button
              id="nav-search-screen"
              type="button"
              onClick={() => onSelectScreen('search')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScreen === 'search'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search & Status</span>
            </button>
            <button
              id="nav-dashboard-screen"
              type="button"
              onClick={() => onSelectScreen('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScreen === 'dashboard'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Arrival Dashboard</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
