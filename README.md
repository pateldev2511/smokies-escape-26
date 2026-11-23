# Smokies Escape ’26

**One Day. Four Friends. Endless Views.** — an offline-first trip companion for Friday, November 27, 2026:
Gainesville, GA → Oconaluftee → Newfound Gap → Kuwohi → Cataract Falls → Gatlinburg → Anakeesta → Moonshine Mountain Coaster → The Park Grill → home.

**Live:** https://pateldev2511.github.io/smokies-escape-26/

## What makes it different
| Feature | What it does |
|---|---|
| **The Ridgeline** | The day as a real elevation profile (Open-Meteo DEM, 1,247 → 6,643 ft). Scrub through time; the sky follows the true sun position (computed offline) and the forecast for that hour/elevation appears. |
| **Schedule engine** | Trip Mode re-projects the rest of the day from check-ins, skips and “running late”. Skips free time for flexible stops; meals/dawn/evening are anchored; booked times are fixed and conflicts are flagged — never silently moved. Uses an OSRM all-pairs drive matrix. |
| **Co-Pilot** | Full-screen car mode: Now / Leave-by / Navigate Next, home ETA, driver-shift timer with a 2-hour swap warning, red night-drive mode, screen wake-lock, offline indicator. |
| **Summit alert** | If the live forecast shows snow/ice at Kuwohi or Newfound Gap during the plan, a banner appears with road-status and a one-tap Plan B preview. |
| **Crew Sync (no server)** | Shared state is a per-item last-writer-wins map, passed by link or QR (works with zero signal in the car). Private confirmation notes and photos never leave the device. |
| **Offline PWA** | Service worker precaches the app; viewed map tiles, fonts and the last forecast are cached with timestamps. Installable to the home screen. |
| **Smokies Passport** | Stamps for completed stops, photo missions (photos stored in IndexedDB on the phone), and a generated 1080×1920 Trip Story card. |

Plus: itinerary with photos, map with photo popups and segment links, ticket stubs with status/time/guests/cost/screenshot, budget with settle-up, packing checklist, crew profiles, WhatsApp/native share, print/PDF, .ics export, light/dark themes.

## Editing
Everything lives in [`src/data/trip.ts`](src/data/trip.ts): places (verified coordinates + elevation + source), the drive matrix, stops, bookings, plans, budget, checklist.

## Data sources (no API keys)
Open-Meteo forecast & elevation · OpenStreetMap tiles · OSRM (build-time drive estimates) · Wikidata / US Census geocoder / OSM Nominatim (coordinates) · Wikimedia Commons (photos, credited in the footer).

## Optional: live shared backend
Crew Sync covers four phones without a server. For automatic real-time sync, create a Supabase project with a `trip_kv(key text primary key, v jsonb, t bigint, by text)` table and RLS restricted to invited users, then replace `useShared` / `setShared` in `src/lib/store.ts` with reads/writes to that table (keep the same last-writer-wins rule on `t`).

## Run / deploy
```bash
npm install
npm run dev       # http://localhost:5173/smokies-escape-26/
npm run deploy    # builds and publishes dist/ to the gh-pages branch (GitHub Pages)
```
For Vercel/Netlify: build `npm run build`, output `dist`, set `base: '/'` in `vite.config.ts` and update `SITE_URL` in `trip.ts`.
