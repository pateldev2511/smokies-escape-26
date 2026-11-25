# Smokies Escape ’26

**One Day. Four Friends. Endless Views.** — an offline-first trip companion for Friday, November 27, 2026:
Gainesville, GA → Oconaluftee → Newfound Gap → Kuwohi → Cataract Falls → Gatlinburg → Anakeesta → Moonshine Mountain Coaster → The Park Grill → home.

**Traveler view (share this):** https://pateldev2511.github.io/smokies-escape-26/trip/smokies-2026/
**Organizer dashboard (login):** https://pateldev2511.github.io/smokies-escape-26/admin/

Schedule: Fri Nov 27 rental pickup 6 PM → Sat Nov 28 adventure (depart 3:30 AM) → Sun Nov 29 home ~1–2 AM, rental back by 10 AM.

## Architecture
- **Supabase** project `smokies-escape-26` (Postgres + Auth + Realtime + Storage).
- `trip_drafts` (organizer only) → `publish_trip()` (SECURITY DEFINER, checks `is_organizer()`) → `published_itinerary` (public read-only, realtime).
- `trip_private` + `private-files` bucket hold confirmation numbers, rental refs, notes and attachments — organizer only, never published.
- Row Level Security enforces all of this on the server; the publishable key in `src/lib/doc.tsx` is meant to be public.
- Organizers are listed in `public.organizers`. To add one, create the user in Supabase Auth and insert their `user_id`.
- Travelers' Trip Mode check-ins, passport missions and photos stay on each phone.

## What makes it different
| Feature | What it does |
|---|---|
| **The Ridgeline** | The day as a real elevation profile (Open-Meteo DEM, 1,247 → 6,643 ft). Scrub through time; the sky follows the true sun position (computed offline) and the forecast for that hour/elevation appears. |
| **Schedule engine** | Trip Mode re-projects the rest of the day from check-ins, skips and “running late”. Skips free time for flexible stops; meals/dawn/evening are anchored; booked times are fixed and conflicts are flagged — never silently moved. Uses an OSRM all-pairs drive matrix. |
| **Co-Pilot** | Full-screen car mode: Now / Leave-by / Navigate Next, home ETA, driver-shift timer with a 2-hour swap warning, red night-drive mode, screen wake-lock, offline indicator. |
| **Summit alert** | If the live forecast shows snow/ice at Kuwohi or Newfound Gap during the plan, a banner appears with road-status and a one-tap Plan B preview. |
| **Live publishing** | The organizer saves drafts privately and publishes; every traveler page updates in about a second via Supabase Realtime (plus a 90-second fallback refresh). |
| **Offline PWA** | Service worker precaches the app; viewed map tiles, fonts and the last forecast are cached with timestamps. Installable to the home screen. |
| **Smokies Passport** | Stamps for completed stops, photo missions (photos stored in IndexedDB on the phone), and a generated 1080×1920 Trip Story card. |

Plus: itinerary with photos, map with photo popups and segment links, ticket stubs with status/time/guests/cost/screenshot, budget with settle-up, packing checklist, crew profiles, WhatsApp/native share, print/PDF, .ics export, light/dark themes.

## Editing
Everything lives in [`src/data/trip.ts`](src/data/trip.ts): places (verified coordinates + elevation + source), the drive matrix, stops, bookings, plans, budget, checklist.

## Data sources (no API keys)
Open-Meteo forecast & elevation · OpenStreetMap tiles · OSRM (build-time drive estimates) · Wikidata / US Census geocoder / OSM Nominatim (coordinates) · Wikimedia Commons (photos, credited in the footer).

## Run / deploy
```bash
npm install
npm run dev       # http://localhost:5173/smokies-escape-26/
npm run deploy    # builds and publishes dist/ to the gh-pages branch (GitHub Pages)
```
For Vercel/Netlify: build `npm run build`, output `dist`, set `base: '/'` in `vite.config.ts` and update `SITE_URL` in `trip.ts`.
