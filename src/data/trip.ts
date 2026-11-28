// ─────────────────────────────────────────────────────────────────────────────
// SMOKIES ESCAPE ’26 — the single source of truth.
// Every stop, time, link, price and plan lives here. Edit freely.
// All times are wall-clock America/New_York (the whole route is Eastern).
// ─────────────────────────────────────────────────────────────────────────────

export const TZ = 'America/New_York'
export const TRIP_DATE = '2026-11-28' // Saturday — main adventure day
export const BASE_URL = 'https://pateldev2511.github.io/smokies-escape-26/'
export const SITE_URL = `${BASE_URL}trip/smokies-2026/` // traveler (read-only) link
export const ADMIN_URL = `${BASE_URL}admin/` // organizer dashboard (login required)
export const TRIP_ID = 'smokies-2026'

export type Category = 'Driving' | 'Scenic' | 'Hiking' | 'Food' | 'Adventure' | 'Attraction'
export type ImageKey = 'hero' | 'ocon' | 'ngap' | 'road' | 'kuwohi' | 'kview' | 'kfog' | 'cataract' | 'anak' | 'night' | 'river'
export type PlaceId = 'gnv' | 'ocon' | 'ngap' | 'kuwohi' | 'sugar' | 'downtown' | 'anak' | 'coaster' | 'grill' | 'skypark' | 'spice'

export interface Place {
  id: PlaceId
  name: string
  lat: number
  lng: number
  /** Feet, from Open-Meteo elevation API (Copernicus DEM). */
  elevFt: number
  source: string
}

export const PLACES: Record<PlaceId, Place> = {
  gnv: { id: 'gnv', name: 'Gainesville, GA', lat: 34.2978794, lng: -83.8240663, elevFt: 1247, source: 'OSM Nominatim (city centre)' },
  ocon: { id: 'ocon', name: 'Oconaluftee Visitor Center', lat: 35.5130846, lng: -83.3061007, elevFt: 2054, source: 'OSM — 1194 Newfound Gap Rd' },
  ngap: { id: 'ngap', name: 'Newfound Gap', lat: 35.611111, lng: -83.425, elevFt: 5046, source: 'Wikidata Q7017800' },
  kuwohi: { id: 'kuwohi', name: 'Kuwohi Observation Tower', lat: 35.562923, lng: -83.498317, elevFt: 6643, source: 'Wikidata Q65582396 (Kuwohi Tower)' },
  sugar: { id: 'sugar', name: 'Sugarlands Visitor Center', lat: 35.6856293, lng: -83.5366025, elevFt: 1473, source: 'Wikidata Q36012589' },
  downtown: { id: 'downtown', name: 'The Village Shops', lat: 35.712846, lng: -83.513993, elevFt: 1306, source: 'US Census geocoder — 634 Parkway' },
  anak: { id: 'anak', name: 'Anakeesta (base)', lat: 35.71323, lng: -83.512093, elevFt: 1289, source: 'US Census geocoder — 576 Parkway' },
  coaster: { id: 'coaster', name: 'Moonshine Mountain Coaster', lat: 35.720058, lng: -83.510216, elevFt: 1273, source: 'US Census geocoder — 306 Parkway' },
  grill: { id: 'grill', name: 'The Park Grill', lat: 35.707635, lng: -83.521539, elevFt: 1342, source: 'US Census geocoder — 1110 Parkway' },
  spice: { id: 'spice', name: 'Spice Express Indian Kitchen', lat: 35.783408, lng: -83.551739, elevFt: 1020, source: 'US Census geocoder — 3784 Parkway, Pigeon Forge' },
  skypark: { id: 'skypark', name: 'Gatlinburg SkyPark', lat: 35.71205, lng: -83.517515, elevFt: 1325, source: 'US Census geocoder — 765 Parkway' },
}

/** Drive minutes between places — OSRM (OpenStreetMap) table, no traffic. Verify in Google Maps. */
export const DRIVE: Record<PlaceId, Partial<Record<PlaceId, number>>> = {
  gnv: { ocon: 155, ngap: 184, kuwohi: 208, sugar: 212, downtown: 218, anak: 218, coaster: 220, grill: 216, skypark: 217 },
  ocon: { gnv: 156, ngap: 30, kuwohi: 54, sugar: 58, downtown: 64, anak: 64, coaster: 66, grill: 62, skypark: 63 },
  ngap: { gnv: 185, ocon: 30, kuwohi: 26, sugar: 29, downtown: 34, anak: 35, coaster: 36, grill: 32, skypark: 34 },
  kuwohi: { gnv: 209, ocon: 54, ngap: 26, sugar: 54, downtown: 60, anak: 60, coaster: 62, grill: 58, skypark: 59 },
  sugar: { gnv: 214, ocon: 59, ngap: 29, kuwohi: 55, downtown: 8, anak: 8, coaster: 10, grill: 6, skypark: 7 },
  downtown: { gnv: 218, ocon: 64, ngap: 34, kuwohi: 59, sugar: 7, anak: 5, coaster: 12, grill: 15, skypark: 5 },
  anak: { gnv: 219, ocon: 64, ngap: 35, kuwohi: 60, sugar: 7, downtown: 5, coaster: 12, grill: 15, skypark: 5, spice: 14 },
  coaster: { gnv: 220, ocon: 66, ngap: 36, kuwohi: 61, sugar: 9, downtown: 12, anak: 12, grill: 15, skypark: 12, spice: 13 },
  grill: { gnv: 217, ocon: 62, ngap: 32, kuwohi: 58, sugar: 5, downtown: 15, anak: 15, coaster: 15, skypark: 12 },
  skypark: { gnv: 218, ocon: 63, ngap: 33, kuwohi: 59, sugar: 6, downtown: 5, anak: 5, coaster: 12, grill: 12 },
  spice: { gnv: 232 },
}
// Downtown legs use walking / park-and-walk buffers (5–15 min) rather than raw 1–4 min drive times.

export const ROUTE_ALTERNATIVES = {
  overPark: { min: 232, mi: 150.1, label: 'From Pigeon Forge over Newfound Gap (US-441 through the park)' },
  aroundPark: { min: 324, mi: 244.8, label: 'From Pigeon Forge around the park via I-40 & Asheville' },
  aroundParkFromGatlinburg: { min: 342, mi: 251.2, label: 'From Gatlinburg around the park via Pigeon Forge, I-40 & Asheville' },
  viaKnoxville: { min: 362, mi: 276.6, label: 'From Gatlinburg via Knoxville, I-75 & Chattanooga' },
}

const enc = encodeURIComponent
export const dir = (dest: string, origin?: string, waypoints?: string[]) =>
  `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${enc(origin)}` : ''}&destination=${enc(dest)}${waypoints?.length ? `&waypoints=${waypoints.map(enc).join('%7C')}` : ''}&travelmode=driving`
export const search = (q: string) => `https://www.google.com/maps/search/?api=1&query=${enc(q).replace(/%20/g, '+')}`

export interface Stop {
  id: string
  n: number
  place: PlaceId
  /** For organizer-added stops: geocoded position (source recorded). */
  geo?: { lat: number; lng: number; elevFt?: number; source: string }
  /** Organizer-set: kept in trip history but removed from the active plan. */
  skipped?: boolean
  skipReason?: string
  /** Organizer-set actual progress (published to everyone). */
  actual?: { s: 'arrived' | 'done' | 'skipped'; at?: string }
  /** Explicit drive minutes from the previous active stop (overrides the matrix). */
  driveIn?: number
  title: string
  kicker: string
  category: Category
  /** Planned window (HH:MM, Eastern). Windows include the drive into the stop when travelIn > 0. */
  start: string
  end: string
  travelIn: number
  /** Anchored stops never start before their planned time (meals, dawn, evening). Others move earlier when time frees up. */
  anchor?: boolean
  fixed?: boolean
  optional?: boolean
  bookingId?: string
  image?: ImageKey
  description: string
  activities: string[]
  cost: string
  costLow: number
  costHigh: number
  difficulty: string
  weather: 'High' | 'Medium' | 'Low'
  tips: string[]
  alerts?: { text: string; url?: string; label?: string }[]
  mapsUrl: string
  navUrl: string
  links?: { label: string; url: string }[]
  missions: string[]
  address?: string
}

export const STOPS: Stop[] = [
  {
    id: 'depart', n: 1, place: 'gnv', title: 'Depart Gainesville', kicker: 'Before sunrise', category: 'Driving',
    start: '03:30', end: '07:45', travelIn: 0,
    description: 'Start the adventure before sunrise. Leave Gainesville around 3:30 AM and drive toward Cherokee, the southern gateway to Great Smoky Mountains National Park. Plan a breakfast, coffee, fuel or restroom stop as needed.',
    activities: ['Full tank before leaving', 'Breakfast / coffee stop', 'Restrooms', 'Share driving to manage fatigue'],
    cost: 'Fuel + breakfast', costLow: 0, costHigh: 0, difficulty: 'Driving', weather: 'Medium',
    tips: ['OSRM estimates ≈ 2 h 35 min to Oconaluftee without traffic — you may arrive ~6:05 AM, before sunrise ({SUNRISE}). Use the slack for a sit-down breakfast, or leave later.', 'Download offline maps — cell service inside the park is limited.', 'Recalculate in Google Maps on the morning: Thanksgiving traffic and weather change everything.'],
    mapsUrl: search('Gainesville, GA'),
    navUrl: 'https://www.google.com/maps/dir/?api=1&origin=Gainesville%2C+GA&destination=Oconaluftee+Visitor+Center%2C+Cherokee%2C+NC&travelmode=driving',
    missions: ['Car selfie at departure', 'First coffee of the day'],
  },
  {
    id: 'ocon', anchor: true, n: 2, place: 'ocon', title: 'Oconaluftee Visitor Center', kicker: 'River, meadow & maybe elk', category: 'Scenic',
    start: '07:45', end: '08:15', travelIn: 0, image: 'ocon', address: '1194 Newfound Gap Road, Cherokee, NC 28719',
    description: 'Begin your Smoky Mountains experience along the Oconaluftee River and meadow area — misty mountain scenery, riverside views and the chance of spotting elk from a safe distance. Wildlife sightings are not guaranteed.',
    activities: ['Morning photography', 'Riverside viewing', 'Scenic meadow walk', 'Possible wildlife spotting'],
    cost: 'No attraction admission', costLow: 0, costHigh: 0, difficulty: 'Easy', weather: 'Medium',
    tips: ['Visitor-center indoor hours may differ from outdoor access.', 'Elk: stay at least 50 yards (150 ft) away — use a zoom lens.', 'A park parking tag is required to park longer than 15 minutes.'],
    mapsUrl: search('Oconaluftee Visitor Center Cherokee NC'),
    navUrl: dir('Oconaluftee Visitor Center, Cherokee, NC'),
    links: [{ label: 'NPS visitor centers', url: 'https://www.nps.gov/grsm/planyourvisit/visitorcenters.htm' }],
    missions: ['Spot an elk (from 50+ yards!)', 'River reflection photo'],
  },
  {
    id: 'ngap', n: 3, place: 'ngap', title: 'Newfound Gap', kicker: 'The TN–NC state line', category: 'Scenic',
    start: '08:15', end: '09:20', travelIn: 30, image: 'ngap',
    description: 'Drive US-441 through spectacular forest and mountain scenery to Newfound Gap on the Tennessee–North Carolina line. Panoramic views, scenic photography and short walks near the designated overlook.',
    activities: ['One or two roadside viewpoints', 'Photograph the ridges', 'State-line marker', 'Fresh mountain air'],
    cost: 'No attraction admission', costLow: 0, costHigh: 0, difficulty: 'Easy', weather: 'High',
    tips: ['≈ 65 min including the ≈ 30-min drive up from Oconaluftee.', 'Use designated pullouts only.'],
    alerts: [{ text: 'Newfound Gap Road can close temporarily due to winter weather.', url: 'https://www.nps.gov/grsm/planyourvisit/temproadclose.htm', label: 'Check road closures' }],
    mapsUrl: search('Newfound Gap Great Smoky Mountains'),
    navUrl: dir('Newfound Gap, Great Smoky Mountains National Park', 'Oconaluftee Visitor Center, Cherokee, NC'),
    missions: ['One foot in TN, one in NC', 'Group photo at the overlook'],
  },
  {
    id: 'kuwohi', n: 4, place: 'kuwohi', title: 'Kuwohi Observation Tower', kicker: 'Highest point in the park · formerly Clingmans Dome', category: 'Hiking',
    start: '09:20', end: '10:55', travelIn: 26, image: 'kuwohi',
    description: 'Drive up Kuwohi Road and walk the ≈ 1-mile round-trip paved trail to the observation tower — short but steep. Spectacular panoramic views when visibility allows.',
    activities: ['Scenic mountain drive', 'Steep paved walk (≈ 1 mi round trip)', 'Observation tower', 'Panorama & group photos'],
    cost: 'Parking tag (see Tickets)', costLow: 0, costHigh: 0, difficulty: 'Moderate · short but steep', weather: 'High',
    tips: ['70–95 min including driving, parking and walking.', 'It is often 15–25 °F colder and windier up here than in Gatlinburg — bring gloves and a hat.', 'Fog is common; the view can be zero. That’s the Smokies.'],
    alerts: [{ text: 'Kuwohi Road is scheduled to stay open through Nov 29 but may close for snow or ice. Never assume it’s open.', url: 'https://www.nps.gov/grsm/planyourvisit/seasonalroads.htm', label: 'Seasonal roads' }],
    mapsUrl: search('Kuwohi Observation Tower Great Smoky Mountains'),
    navUrl: dir('Kuwohi Observation Tower, Great Smoky Mountains National Park', 'Newfound Gap, Great Smoky Mountains National Park'),
    missions: ['Summit selfie at 6,643 ft', 'Count the ridgelines you can see'],
  },
  {
    id: 'cataract', n: 5, place: 'sugar', title: 'Cataract Falls', kicker: 'Forest walk from Sugarlands', category: 'Hiking',
    start: '10:55', end: '12:30', travelIn: 54, image: 'cataract', address: '1420 Fighting Creek Gap Road, Gatlinburg, TN 37738',
    description: 'After descending from Kuwohi, stop at Sugarlands Visitor Center for an easy ≈ 0.7-mile round-trip forest walk to a small waterfall — a relaxed second hike.',
    activities: ['Forest walk', 'Waterfall photography', 'Relaxing nature break', 'Restrooms at Sugarlands'],
    cost: 'Parking tag (see Tickets)', costLow: 0, costHigh: 0, difficulty: 'Easy · 35–45 min walk', weather: 'Medium',
    tips: ['Navigate to Sugarlands Visitor Center — don’t try to drive to the falls.', 'The ≈ 54-min drive down from Kuwohi is inside this window.'],
    alerts: [{ text: 'Laurel Falls Trail is closed for rehabilitation — don’t substitute it.' }],
    mapsUrl: search('Sugarlands Visitor Center Gatlinburg TN'),
    navUrl: dir('Sugarlands Visitor Center, Gatlinburg, TN', 'Kuwohi Observation Tower, Great Smoky Mountains National Park'),
    missions: ['Waterfall long-exposure attempt', 'Find the footbridge'],
  },
  {
    id: 'downtown', anchor: true, n: 6, place: 'downtown', title: 'Gatlinburg Lunch & Downtown', kicker: 'The Parkway, shops & sweets', category: 'Food',
    start: '12:30', end: '14:30', travelIn: 8, image: 'anak',
    description: 'Explore the lively mountain town — lunch at a local spot, The Village Shops, a stroll along the Parkway, souvenir and sweet shops. Park once for downtown and Anakeesta where practical.',
    activities: ['Nonveg lunch (~60 min)', 'The Village Shops', 'Parkway walk', 'Fudge, taffy & souvenirs'],
    cost: '$15–$25 pp lunch + $12–$25 parking', costLow: 72, costHigh: 125, difficulty: 'Easy', weather: 'Low',
    tips: ['Preferred parking: Gatlinburg Aquarium Parking Garage. Alternative: 526 Parkway.', 'Thanksgiving-weekend Saturday — expect congestion; keep the buffer.'],
    mapsUrl: search('The Village Shops 634 Parkway Gatlinburg TN'),
    navUrl: dir('Gatlinburg Aquarium Parking Garage, Gatlinburg, TN', 'Sugarlands Visitor Center, Gatlinburg, TN'),
    links: [
      { label: 'Aquarium Parking Garage', url: search('Gatlinburg Aquarium Parking Garage') },
      { label: 'Alt parking: 526 Parkway', url: search('526 Parkway Gatlinburg TN Parking') },
      { label: 'The Village Shops', url: search('The Village Shops 634 Parkway Gatlinburg TN') },
    ],
    missions: ['Taste-test fudge', 'Find the oldest-looking building'],
  },
  {
    id: 'anakeesta', anchor: true, n: 7, place: 'anak', title: 'Anakeesta', kicker: 'Mountaintop village · sunset · lights', category: 'Attraction',
    start: '14:30', end: '18:15', travelIn: 5, bookingId: 'anakeesta', image: 'kview', address: '576 Parkway, Gatlinburg, TN 37738',
    description: 'Ride up to the mountaintop village above Gatlinburg: viewpoints, the Treetop Skywalk, gardens and seasonal holiday decorations (Journey to the North Pole). Stay for sunset and the lights.',
    activities: ['Ride to the summit', 'Treetop Skywalk', 'Scenic viewpoints', 'Sunset photos', 'Holiday lights', 'Snacks / drinks'],
    cost: '$39–$45 per adult (verify at checkout)', costLow: 156, costHigh: 180, difficulty: 'Easy–moderate walking', weather: 'Medium',
    tips: ['Some rides inside are extra-cost — don’t assume they’re included.', 'Sunset in Gatlinburg is {SUNSET} — be at a west-facing viewpoint ~20 min before.'],
    mapsUrl: search('Anakeesta 576 Parkway Gatlinburg TN'),
    navUrl: dir('Anakeesta, 576 Parkway, Gatlinburg, TN'),
    links: [
      { label: 'Official site', url: 'https://anakeesta.com/' },
      { label: 'Hours & directions', url: 'https://anakeesta.com/hours-location-and-directions/' },
    ],
    missions: ['Skywalk group shot', 'Golden-hour silhouette', 'First holiday light'],
  },
  {
    id: 'coaster', anchor: true, n: 8, place: 'coaster', title: 'Moonshine Mountain Coaster', kicker: 'After-dark thrill', category: 'Adventure',
    start: '18:15', end: '19:15', travelIn: 12, bookingId: 'coaster', image: 'night', address: '306 Parkway, Gatlinburg, TN 37738',
    description: 'A mountain coaster ride after dark on an individual sled — 45–60 min including the walk from Anakeesta (≈ 0.5 mi), entry and queue.',
    activities: ['Coaster ride', 'Night photos where permitted'],
    cost: '≈ $18 per adult (verify)', costLow: 72, costHigh: 72, difficulty: 'Thrill', weather: 'High',
    tips: ['Operations are weather dependent.', 'Buying ahead doesn’t guarantee skipping the queue.'],
    mapsUrl: search('Moonshine Mountain Coaster 306 Parkway Gatlinburg TN'),
    navUrl: `https://www.google.com/maps/dir/?api=1&origin=${enc('Anakeesta, 576 Parkway, Gatlinburg, TN')}&destination=${enc('Moonshine Mountain Coaster, 306 Parkway, Gatlinburg, TN')}&travelmode=walking`,
    links: [{ label: 'Hours', url: 'https://www.moonshinemountaincoaster.com/hours/' }],
    missions: ['Scream-face photo', 'Who brakes the least?'],
  },
  {
    id: 'dinner', anchor: true, n: 9, place: 'spice', title: 'Dinner at Spice Express Indian Kitchen', kicker: 'Indian · Pigeon Forge', category: 'Food',
    start: '19:15', end: '21:00', travelIn: 45, bookingId: 'dinner', address: '3784 Parkway #101, Pigeon Forge, TN 37863',
    description: 'An Indian dinner on the way out of the mountains — chicken tikka masala, butter chicken, biryani, lamb curry and naan. Pigeon Forge is north of Gatlinburg, so it sits on the route home. Dine-in and takeaway.',
    activities: ['7:15–8:00 PM: drive from the coaster (holiday-traffic buffer)', '8:00–9:00 PM: dinner for four', 'Trip toast'],
    cost: '$20–$30 per person (estimate)', costLow: 80, costHigh: 120, difficulty: 'Relaxed', weather: 'Low',
    tips: [
      'Published hours: Saturday 12 PM – 10 PM. Thanksgiving-weekend hours are not posted — call (865) 365-1077 to confirm.',
      'No online reservation system found — call ahead to check seating for four around 8 PM.',
      'The drive from the coaster is ≈ 13 min without traffic (OSRM, 6.1 mi); the 45-minute window is a holiday-traffic buffer.',
      'Arriving home ~1:30–3:00 AM leaves less sleep before the 10 AM rental return. To keep a 1–2 AM arrival, shorten downtown or finish Anakeesta 30–45 min earlier — and aim to finish dinner closer to 8:30 PM.',
    ],
    mapsUrl: search('Spice Express Indian Kitchen 3784 Parkway Pigeon Forge TN'),
    navUrl: dir('Spice Express Indian Kitchen, 3784 Parkway #101, Pigeon Forge, TN 37863', 'Moonshine Mountain Coaster, 306 Parkway, Gatlinburg, TN'),
    links: [
      { label: 'Menu', url: 'https://spiceexpressindiankitchen.com/menu/' },
      { label: 'Official site', url: 'https://spiceexpressindiankitchen.com/' },
      { label: 'Call (865) 365-1077', url: 'tel:+18653651077' },
    ],
    missions: ['Best bite of the day vote', 'Who orders the spiciest dish?'],
  },
  {
    id: 'home', n: 10, place: 'gnv', title: 'Return to Gainesville', kicker: 'Two drivers, zero heroics', category: 'Driving',
    start: '21:00', end: '27:00', travelIn: 0,
    description: 'Drive home sharing the wheel. Plan at least one proper rest stop. Never continue while sleepy — use the safest available route rather than automatically crossing high mountain roads at night.',
    activities: ['Driver swap plan', 'Fuel + restroom stop', 'Arrive ~1:30–3:00 AM Sunday (traffic dependent)'],
    cost: 'Fuel (see budget)', costLow: 0, costHigh: 0, difficulty: 'Long night drive', weather: 'Medium',
    tips: [`OSRM from Pigeon Forge: over Newfound Gap ≈ 3 h 52 min (150 mi) · around the park via I-40/Asheville ≈ 5 h 24 min (245 mi). Check road status and pick the safe one.`, 'Night mode in Co-Pilot dims the screen red for the passengers.'],
    mapsUrl: search('Gainesville, GA'),
    navUrl: dir('Gainesville, GA', 'Spice Express Indian Kitchen, 3784 Parkway #101, Pigeon Forge, TN 37863'),
    links: [{ label: 'Route around the park (I-40)', url: dir('Gainesville, GA', 'Pigeon Forge, TN', ['Newport, TN', 'Asheville, NC']) }],
    missions: ['Best moment of the day — everyone answers'],
  },
]

// ── Bookings ────────────────────────────────────────────────────────────────
export type BookingStatus = 'Not booked' | 'Booking in progress' | 'Holiday hours / seating to confirm' | 'Status unknown' | 'Confirmed' | 'Cancelled' | 'Not required'
export const BOOKING_STATUSES: BookingStatus[] = ['Not booked', 'Booking in progress', 'Holiday hours / seating to confirm', 'Status unknown', 'Confirmed', 'Cancelled', 'Not required']
export interface Booking {
  id: string
  title: string
  what: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'REQUIRED'
  preferred: string
  guests: number
  cost: string
  url: string
  cta: string
  info?: { label: string; url: string }
  stopId?: string
  notes: string[]
  // live fields (edited by the organizer, published to travelers)
  status: BookingStatus
  date: string
  time?: string
  price?: string
  publicNote?: string
  cancelBy?: string
}
export const BOOKINGS: Booking[] = [
  {
    id: 'anakeesta', title: 'Anakeesta', what: '4 adult timed-entry tickets · Sat Nov 28', priority: 'CRITICAL', preferred: 'Entry 2:30–3:00 PM', guests: 4,
    cost: '$39–$45 / adult · ≈ $156–$180', url: 'https://tickets.anakeesta.com/webstore/shop/viewitems.aspx?c=web4&cg=web', cta: 'BOOK 4 ANAKEESTA TICKETS',
    info: { label: 'Hours', url: 'https://anakeesta.com/hours-location-and-directions/' }, stopId: 'anakeesta',
    notes: ['Journey to the North Pole is listed on Anakeesta’s calendar for Nov 28.', 'Verify the exact price at checkout — extras inside cost more.'],
    status: 'Not booked', date: '2026-11-28',
  },
  {
    id: 'dinner', title: 'Spice Express Indian Kitchen', what: 'Dinner for 4 · Sat Nov 28 · Pigeon Forge', priority: 'HIGH', preferred: 'Arrive ≈ 8:00 PM', guests: 4,
    cost: '$20–$30 pp (estimate)', url: 'tel:+18653651077', cta: 'Call (865) 365-1077', info: { label: 'Menu', url: 'https://spiceexpressindiankitchen.com/menu/' }, stopId: 'dinner',
    notes: ['No online reservation system found — call to confirm holiday hours and seating for four around 8 PM.', 'Published Saturday hours: 12 PM – 10 PM.'], status: 'Holiday hours / seating to confirm', date: '2026-11-28',
  },
  {
    id: 'coaster', title: 'Moonshine Mountain Coaster', what: '4 adult single rides · evening', priority: 'MEDIUM', preferred: 'After ~6:15 PM', guests: 4,
    cost: '≈ $18 / adult · ≈ $72', url: 'https://www.moonshinemountaincoaster.com/buy-tickets/', cta: 'Buy coaster tickets', info: { label: 'Hours', url: 'https://www.moonshinemountaincoaster.com/hours/' }, stopId: 'coaster',
    notes: ['Published Saturday hours 10 AM–11 PM, weather permitting.', 'Advance tickets don’t guarantee skipping the line.'], status: 'Not booked', date: '2026-11-28',
  },
  {
    id: 'parking', title: 'Smokies Parking Tag', what: '1 car · daily tag for Sat Nov 28', priority: 'REQUIRED', preferred: 'Valid all day', guests: 1,
    cost: '$5 daily tag', url: 'https://www.recreation.gov/activitypass/AP2510', cta: 'Buy parking tag', info: { label: 'NPS fees', url: 'https://www.nps.gov/grsm/planyourvisit/fees.htm' },
    notes: ['Required to park in the park for more than 15 minutes.'], status: 'Not booked', date: '2026-11-28',
  },
]

// ── Rental car ──────────────────────────────────────────────────────────────
export type RentalStatus = 'Not picked up' | 'Picked up' | 'In use' | 'Return pending' | 'Returned'
export const RENTAL_STATUSES: RentalStatus[] = ['Not picked up', 'Picked up', 'In use', 'Return pending', 'Returned']
export interface Geo { lat: number; lng: number; source: string; label?: string }
export interface Rental {
  status: RentalStatus
  bookingStatus: BookingStatus
  company: string
  pickupAddress: string
  returnAddress: string
  pickupGeo?: Geo
  returnGeo?: Geo
  /** OSRM drive minutes from Gainesville to the return address (computed in the dashboard). */
  returnDriveMin?: number
  returnBufferMin: number
  pickupAt: string // local ET ISO-ish "YYYY-MM-DDTHH:MM"
  returnBy: string
  vehicle: string
  mileageOut: string
  mileageIn: string
  fuelOut: string
  cost: string
  drivers: string
}
export const RENTAL_DEFAULT: Rental = {
  status: 'Not picked up', bookingStatus: 'Not booked', company: '', pickupAddress: '', returnAddress: '', returnBufferMin: 20,
  pickupAt: '2026-11-27T18:00', returnBy: '2026-11-29T10:00', vehicle: '', mileageOut: '', mileageIn: '', fuelOut: '', cost: '', drivers: '',
}

// ── Friday & Sunday ─────────────────────────────────────────────────────────
export interface DayItem { id: string; time: string; title: string; details: string[]; kind?: 'rental-pickup' | 'final-check' | 'rental-return' | 'home' }
export const FRIDAY: DayItem[] = [
  { id: 'f1', time: '18:00', title: 'Pick up rental car', kind: 'rental-pickup', details: ['Collect the vehicle; check driver’s licenses and the rental agreement.', 'Photograph every side before leaving — note existing damage.', 'Confirm fuel policy, mileage limits and additional-driver authorization.', 'Check the return instructions and location.'] },
  { id: 'f2', time: '18:30', title: 'Vehicle preparation', details: ['Fuel if needed.', 'Load luggage, snacks and water.', 'Download offline maps.', 'Check weather and NPS road closures.'] },
  { id: 'f3', time: '19:30', title: 'Final trip check', kind: 'final-check', details: ['Confirm Anakeesta, coaster and the park parking tag; call Spice Express about holiday hours.', 'Check mountain road availability.', 'Agree driver responsibilities.'] },
  { id: 'f4', time: '20:00', title: 'Sleep', details: ['Lights out early — alarms for the 3:30 AM departure.'] },
]
export const SUNDAY: DayItem[] = [
  { id: 's1', time: '01:30', title: 'Target arrival home', kind: 'home', details: ['≈ 1:30–3:00 AM, traffic dependent — never forced if a driver is sleepy.'] },
  { id: 's2', time: '03:00', title: 'Unload & rest', details: ['Bring everything inside; phones on chargers.'] },
  { id: 's3', time: '08:30', title: 'Vehicle check', details: ['Refuel if the policy requires it.', 'Note mileage and fuel level.', 'Final walk-around photos; gather belongings.'] },
  { id: 's4', time: '10:00', title: 'Return the rental car', kind: 'rental-return', details: ['Return to the agreed location by 10:00 AM.'] },
]

// ── Plans ───────────────────────────────────────────────────────────────────
export type PlanId = 'A' | 'B' | 'C'
export interface Plan { id: PlanId; name: string; short: string; skip: string[]; extend?: Record<string, number>; morningVia?: 'around'; notes: string[]; keeps: string[] }
export const PLANS: Plan[] = [
  { id: 'A', name: 'Plan A — Original Route', short: 'Cherokee → Newfound Gap → Kuwohi → Cataract → Gatlinburg → Anakeesta → Coaster → Dinner', skip: [], notes: ['The full original itinerary.'], keeps: ['All reservations unchanged.'] },
  {
    id: 'B', name: 'Plan B — Kuwohi Closed', short: 'Keep Newfound Gap if open, skip Kuwohi, more time at Cataract Falls & Gatlinburg', skip: ['kuwohi'], extend: { cataract: 20, downtown: 40 },
    notes: ['Kuwohi skipped — enjoy other permitted scenic pullouts on US-441.', 'Extra time goes to Cataract Falls (+20 min) and downtown Gatlinburg (+40 min).'], keeps: ['Anakeesta and coaster tickets unchanged; dinner at Spice Express unchanged.'],
  },
  {
    id: 'C', name: 'Plan C — Mountain Roads Closed', short: 'Skip the closed mountain roads. Alternate highway from Cherokee: US-74 → I-40 → Exit 407 → Sevierville → Pigeon Forge → Gatlinburg', skip: ['bigwitch', 'ngap', 'kuwohi'],
    notes: ['Big Witch Overlook, Newfound Gap and Kuwohi skipped due to road closures (kept in trip history).', 'Alternate highway corridor via Waynesville and Sevierville — OSRM ≈ 2 h 43 min without traffic; allow 2.5–3.5 h. Check live Google Maps before driving.', 'Cataract Falls only if accessible and time permits. Never drive past closure barriers.'],
    keeps: ['Anakeesta Full Access and the 8:45 PM coaster booking unchanged.', 'Dinner to be finalized: Option A early in Gatlinburg (recommended) or Option B Spice Express.'],
  },
]
export const SKYPARK = { tickets: 'https://www.gatlinburgskypark.com/tickets', maps: search('Gatlinburg SkyPark 765 Parkway Gatlinburg TN') }

// ── Budget ──────────────────────────────────────────────────────────────────
export const EXPENSE_CATS = ['Rental', 'Activities', 'Food', 'Fuel', 'Parking', 'Other'] as const
export type ExpenseCat = (typeof EXPENSE_CATS)[number]
export interface BudgetLine { id: string; label: string; cat: ExpenseCat; low: number; high: number; deposit?: boolean }
export const BUDGET: BudgetLine[] = [
  { id: 'rental', label: 'Rental car (enter actual price)', cat: 'Rental', low: 0, high: 0 },
  { id: 'deposit', label: 'Rental deposit (refundable — not counted)', cat: 'Rental', low: 0, high: 0, deposit: true },
  { id: 'tag', label: 'Park daily parking tag', cat: 'Parking', low: 5, high: 5 },
  { id: 'anak', label: 'Anakeesta admission (4)', cat: 'Activities', low: 156, high: 180 },
  { id: 'coaster', label: 'Moonshine coaster (4)', cat: 'Activities', low: 72, high: 72 },
  { id: 'dpark', label: 'Downtown parking', cat: 'Parking', low: 12, high: 25 },
  { id: 'bfast', label: 'Breakfast / snacks', cat: 'Food', low: 25, high: 45 },
  { id: 'lunch', label: 'Lunch', cat: 'Food', low: 60, high: 100 },
  { id: 'dinner', label: 'Dinner (Spice Express)', cat: 'Food', low: 80, high: 120 },
  { id: 'fuel', label: 'Fuel', cat: 'Fuel', low: 45, high: 75 },
]
export interface Expense { id: string; label: string; amount: number; cat: ExpenseCat; paidBy: string; at: number }

// ── Checklist ───────────────────────────────────────────────────────────────
export const CHECKLIST: Record<string, string[]> = {
  'Rental (Fri)': ['Licenses for both drivers', 'Damage photos taken', 'Fuel policy confirmed', 'Mileage noted', 'Second driver authorized'],
  Car: ['Fuel', 'Tire pressure', 'Insurance', 'Phone charger', 'Offline maps', 'Emergency supplies'],
  Clothing: ['Warm jacket', 'Layers', 'Hiking shoes', 'Gloves', 'Rain protection'],
  Personal: ['Water', 'Snacks', 'Phone', 'Power bank', 'Wallet', 'Camera', 'Sunglasses'],
  Bookings: ['Anakeesta tickets', 'Coaster tickets', 'Park parking tag printed', 'Restaurant hours & seating confirmed (call)', 'Booking screenshots'],
  'Before Leaving': ['Weather checked', 'Roads checked', 'Drivers rested', 'Departure time confirmed', 'Route downloaded'],
  'Return (Sun)': ['Refuel if required', 'Final mileage noted', 'Return photos taken', 'Belongings collected'],
}

export const TRAVELERS_DEFAULT = [
  { id: 'a', name: 'Friend 1', emoji: '🧭', driver: true, color: '#E8B86D' },
  { id: 'b', name: 'Friend 2', emoji: '📸', driver: true, color: '#7FC8A9' },
  { id: 'c', name: 'Friend 3', emoji: '🥾', driver: false, color: '#9DB4E0' },
  { id: 'd', name: 'Friend 4', emoji: '🎢', driver: false, color: '#E59A8C' },
]

export const WEATHER_POINTS: { id: string; name: string; place: PlaceId; hour: number }[] = [
  { id: 'cherokee', name: 'Cherokee', place: 'ocon', hour: 8 },
  { id: 'ngap', name: 'Newfound Gap', place: 'ngap', hour: 9 },
  { id: 'kuwohi', name: 'Kuwohi', place: 'kuwohi', hour: 10 },
  { id: 'gat', name: 'Gatlinburg', place: 'anak', hour: 15 },
]

export const SAFETY = [
  { text: 'Kuwohi Road can close for ice or snow.', url: 'https://www.nps.gov/grsm/planyourvisit/seasonalroads.htm' },
  { text: 'Newfound Gap Road can close.', url: 'https://www.nps.gov/grsm/planyourvisit/temproadclose.htm' },
  { text: 'Elevated areas can be below freezing.' },
  { text: 'National park travel times vary — fog and traffic slow everything.' },
  { text: 'Holiday-weekend crowds can affect parking and queues.' },
  { text: 'Laurel Falls Trail is closed for rehabilitation.' },
]
export const ROAD_STATUS_URL = 'https://www.nps.gov/grsm/planyourvisit/temproadclose.htm'

export const SHARE_MESSAGE = `🏔️ SMOKIES ESCAPE ’26

Our adventure is officially planned!

🚗 Friday, Nov 27 — Rental pickup at 6 PM
🌄 Saturday, Nov 28 — Smoky Mountains + Gatlinburg
🏠 Sunday, Nov 29 — Home and rental return by 10 AM

4 friends, 1 car and a full day of adventure!

Check our live trip itinerary, maps, booking statuses and plans:

${SITE_URL}`

export const FULL_ROUTE = {
  all: dir('Gainesville, GA', 'Gainesville, GA', ['Oconaluftee Visitor Center, Cherokee, NC', 'Newfound Gap, TN', 'Kuwohi Observation Tower', 'Sugarlands Visitor Center, Gatlinburg, TN', 'Anakeesta, Gatlinburg, TN', 'Spice Express Indian Kitchen, Pigeon Forge, TN']),
  morning: dir('Oconaluftee Visitor Center, Cherokee, NC', 'Gainesville, GA'),
  scenic: dir('Sugarlands Visitor Center, Gatlinburg, TN', 'Oconaluftee Visitor Center, Cherokee, NC', ['Newfound Gap, TN', 'Kuwohi Observation Tower']),
  afternoon: dir('Spice Express Indian Kitchen, 3784 Parkway #101, Pigeon Forge, TN', 'Sugarlands Visitor Center, Gatlinburg, TN', ['Anakeesta, 576 Parkway, Gatlinburg, TN', 'Moonshine Mountain Coaster, 306 Parkway, Gatlinburg, TN']),
  home: dir('Gainesville, GA', 'Spice Express Indian Kitchen, 3784 Parkway #101, Pigeon Forge, TN'),
}
