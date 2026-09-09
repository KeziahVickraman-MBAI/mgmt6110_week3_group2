/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import ArrivalDashboard from './components/ArrivalDashboard.jsx';
import BusStopSearch from './components/BusStopSearch.jsx';
import Header from './components/Header.jsx';
import LiveBusArrivalPanel from './components/LiveBusArrivalPanel.jsx';
import { INITIAL_BUS_STOPS } from './data/mockBusData.js';

export default function App() {
  // Navigation between screens by React state (no router library)
  // Defaults to 'live' for the live LTA Bus Arrival Panel
  const [activeScreen, setActiveScreen] = useState('live');
  const [busStops, setBusStops] = useState(INITIAL_BUS_STOPS);
  const [selectedStopCode, setSelectedStopCode] = useState('08057');
  const [lastUpdatedTime, setLastUpdatedTime] = useState(() => {
    return new Date().toLocaleTimeString('en-SG', {
      timeZone: 'Asia/Singapore',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  });

  // Function to simulate receiving updates on bus arrival times (recalculating the new ETA)
  const handleUpdateTimes = useCallback(() => {
    const timestamp = new Date().toLocaleTimeString('en-SG', {
      timeZone: 'Asia/Singapore',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    setLastUpdatedTime(timestamp);

    setBusStops((prevStops) =>
      prevStops.map((stop) => ({
        ...stop,
        buses: stop.buses.map((bus) => {
          // Decrement ETA or reset to new cycle if it reaches 0
          let newEta = bus.etaMinutes - 1;
          let newSubsequent = bus.subsequentEta - 1;
          let newThird = bus.thirdEta - 1;

          if (newEta < 0) {
            newEta = Math.max(1, newSubsequent);
            newSubsequent = Math.max(newEta + 4, newThird);
            newThird = newSubsequent + Math.floor(Math.random() * 6) + 6;
          }

          // Randomly fluctuate occupancy status over time
          const statuses = [
            { text: 'Seats Available', code: 'green' },
            { text: 'Standing Available', code: 'amber' },
            { text: 'Limited Standing', code: 'red' },
          ];
          const shouldShiftStatus = Math.random() < 0.2;
          const randomStatus = shouldShiftStatus
            ? statuses[Math.floor(Math.random() * statuses.length)]
            : { text: bus.status, code: bus.statusCode };

          return {
            ...bus,
            etaMinutes: newEta,
            subsequentEta: Math.max(newEta + 3, newSubsequent),
            thirdEta: Math.max(newSubsequent + 5, newThird),
            status: randomStatus.text,
            statusCode: randomStatus.code,
          };
        }),
      }))
    );
  }, []);

  // Function to input/add new bus stop details (Stop number and Name)
  const handleAddBusStop = useCallback(
    ({ code, name, road }) => {
      // Generate synthetic bus services for the new stop
      const sampleServices = ['23', '36', '124', '167', '851'];
      const generatedBuses = sampleServices.slice(0, 3 + (code.charCodeAt(0) % 2)).map((srv, idx) => ({
        serviceNo: srv,
        destination: `Transit Point ${srv}`,
        status: idx === 0 ? 'Seats Available' : idx === 1 ? 'Standing Available' : 'Seats Available',
        statusCode: idx === 0 ? 'green' : idx === 1 ? 'amber' : 'green',
        type: idx % 2 === 0 ? 'Double Deck' : 'Single Deck',
        wheelchair: true,
        etaMinutes: (idx + 1) * 3 + Math.floor(Math.random() * 2),
        subsequentEta: (idx + 1) * 3 + 8,
        thirdEta: (idx + 1) * 3 + 18,
      }));

      const newStop = {
        code,
        name,
        road: road || 'Singapore Urban Link',
        buses: generatedBuses,
      };

      setBusStops((prev) => [newStop, ...prev]);
      setSelectedStopCode(code);
      return newStop;
    },
    []
  );

  // Navigation handlers
  const handleNavigateToDashboard = useCallback((stopCode) => {
    if (stopCode) setSelectedStopCode(stopCode);
    setActiveScreen('dashboard');
  }, []);

  const handleNavigateToSearch = useCallback(() => {
    setActiveScreen('search');
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100/60 text-zinc-900 flex flex-col font-sans antialiased">
      {/* App Header & Navigation */}
      <Header
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
      />

      {/* Screen Views (Navigated purely by React State) */}
      <main className="flex-1">
        {activeScreen === 'live' && (
          <LiveBusArrivalPanel
            initialStopCode="04121"
            onNavigateToExistingScreens={() => setActiveScreen('dashboard')}
          />
        )}

        {activeScreen === 'search' && (
          <BusStopSearch
            busStops={busStops}
            selectedStopCode={selectedStopCode}
            onSelectStop={setSelectedStopCode}
            onAddBusStop={handleAddBusStop}
            onUpdateTimes={handleUpdateTimes}
            lastUpdatedTime={lastUpdatedTime}
            onNavigateToDashboard={handleNavigateToDashboard}
          />
        )}

        {activeScreen === 'dashboard' && (
          <ArrivalDashboard
            busStops={busStops}
            selectedStopCode={selectedStopCode}
            onSelectStop={setSelectedStopCode}
            onUpdateTimes={handleUpdateTimes}
            lastUpdatedTime={lastUpdatedTime}
            onNavigateToSearch={handleNavigateToSearch}
          />
        )}
      </main>

      {/* Minimalist Context Footer */}
      <footer id="app-footer" className="border-t border-zinc-200 bg-white py-4 px-4 sm:px-6 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Data source: LTA DataMall, under the Singapore Open Data Licence v1.0.
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            MGMT 6110 Human-AI Collaboration
          </span>
        </div>
      </footer>
    </div>
  );
}
