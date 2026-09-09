# Singapore Live Bus Arrival Times Application

A minimalist, responsive front-end application for tracking live bus arrival times across Singapore's transit network.

> **Course Context**: Group Task for **MGMT 6110 Human-AI Collaboration**

---

## 1. Who the User Is

The primary users are **commuters, residents, students, and workers in Singapore** who depend on the local public bus transit system for their daily commute and need quick, reliable information about when their next bus is arriving.

---

## 2. What Job the Product Does for Them

The product performs two essential jobs for the commuter:

1. **Input and Search Bus Stop Details**:
   - Commuters can search existing bus stops by their 5-digit stop code (e.g., `08057`) or by bus stop name (e.g., *Dhoby Ghaut Central*).
   - Commuters can directly **input new bus stop details** (stop number and name) to register and monitor stops they frequent.

2. **Receive Updates on Bus Arrival Times & Status**:
   - Commuters can view the **live status of each bus** (e.g., *Seats Available*, *Standing Available*, *Limited Standing*), bus type (Single Deck / Double Deck), and wheelchair accessibility.
   - Commuters view accurate **ETAs in minutes** (e.g., *2 mins*, *6 mins*, *14 mins*).
   - Commuters can trigger updates manually or watch the auto-refresh countdown to **receive updated ETAs** in real time as buses approach the stop.

---

## 3. Screens & Architecture

Navigation between views is handled entirely via **React state** (`useState`) with **no router library**, complying with project guardrails.

### Screen 1: Live Bus Arrival Panel (`src/components/LiveBusArrivalPanel.jsx`)
- **What it shows**: Live feed of all bus services at the specified stop (defaults to `04121`), displaying the next two arrivals in minutes.
- **Auto-Refresh**: Refreshes automatically every 30 seconds with an active visual countdown and manual refresh trigger.
- **Arrival Threshold**: Shows **"Arriving"** whenever a bus is under one minute away.
- **Service Status**: Shows a plain sentence (`"No buses currently running for this service."`) when a service has no scheduled buses, and handles an empty services array gracefully as `"No buses currently running for this bus stop."`
- **Backend Health Integration**: Integrates directly with `/api/health` to report upstream connection status and response latency.

### Screen 2: Bus Stop Search & Bus Status (`src/components/BusStopSearch.jsx`)
- **What it shows**: Status of each bus operating at the chosen bus stop, including crowding indicator, deck type, and ETA in minutes.
- **What the user does**: Searches by bus stop code or name, inputs custom bus stop details (stop number and name), and selects stops.
- **When it worked**: Displays the live status of each bus with updated ETAs in minutes and an update confirmation notice.

### Screen 3: Arrival Times Dashboard (`src/components/ArrivalDashboard.jsx`)
- **What it shows**: Comprehensive dashboard of the various bus arrival times (Next Bus ETA, 2nd Bus ETA, 3rd Bus ETA) for all services at the stop.
- **When it worked**: Recalculates and visibly displays the **new ETA in minutes** alongside an update confirmation toast and timestamp.

### Header & Navigation (`src/components/Header.jsx`)
- Minimalist navigation bar with Singapore time (SGT clock) and seamless React state switching between the Live Panel, Search & Status, and Arrival Dashboard screens.

---

## 4. Backend Serverless Architecture (`/api/`)

Both serverless function files reside in `api/` in the project root, as siblings of `package.json`:

1. **`api/bus.js`**:
   - Accepts a `BusStopCode` query parameter (defaults to `04121`).
   - Fetches live arrivals from `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival`.
   - Authenticates using `process.env.LTA_ACCOUNT_KEY` via the exact `AccountKey` HTTP header.
   - Computes minutes until arrival from `EstimatedArrival` timestamps.
   - Returns a simplified list with `ServiceNo` and the minutes until each of the next two buses.
   - Sets HTTP header `Cache-Control: s-maxage=20, stale-while-revalidate=40` matching LTA's 20-second cycle.
   - Treats an empty `Services` array as "no buses running", returning an empty list without error.

2. **`api/health.js`**:
   - Verifies whether the account key is configured in the server environment.
   - Verifies upstream connectivity to LTA DataMall.
   - Returns HTTP 200 with `status: "pass"` when healthy, and HTTP 503 with `status: "fail"` when not.
   - Emits standardized diagnostic fields (`keyConfigured`, `upstream`, `lastGoodFetch`, and Singapore SGT ISO timestamp).

---

## 5. Guardrails Compliance

- **Key Protection**: The `LTA_ACCOUNT_KEY` is never written into any file, comment, response, or log. It resides solely in secure environment variables.
- **No Client Secrets**: No environment variables starting with `VITE_` are created.
- **No Direct Browser Calls to Upstream**: Browser code never calls `datamall2.mytransport.sg`; all requests route strictly through the `/api/` serverless functions.
- **No New Packages**: Built purely using existing standard dependencies.
- **No Database / No Login**: Operates cleanly and reliably in memory.
- **Attribution**: "Data source: LTA DataMall, under the Singapore Open Data Licence v1.0." is displayed in the application footer without official endorsement or logos.

---

## 6. Files Created

- `/api/bus.js` — Serverless function for bus arrivals with caching and ETA calculations.
- `/api/health.js` — Serverless function reporting key configuration and upstream status.
- `/src/components/LiveBusArrivalPanel.jsx` — 30s auto-refreshing live bus arrivals panel.
- `/src/components/BusStopSearch.jsx` — Search and input for bus stops and bus status.
- `/src/components/ArrivalDashboard.jsx` — Multi-service arrival ETA dashboard.
- `/src/components/Header.jsx` — Navigation bar and live Singapore Time clock.
- `/src/data/mockBusData.js` — Supporting transit structures.
- `/.env.example` — Environment variable documentation for `LTA_ACCOUNT_KEY`.
- `/README.md` — Project documentation and architecture guide.

---

## 7. Getting Started

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```
The build produces optimized static assets in `/dist`.
