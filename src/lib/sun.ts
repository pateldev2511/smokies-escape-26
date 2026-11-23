// Solar position (NOAA / Meeus approximations). Works offline — no API needed.
const rad = Math.PI / 180

function julian(d: Date) {
  return d.getTime() / 86400000 + 2440587.5
}

/** Sun altitude in degrees at a moment and place. */
export function sunAltitude(d: Date, lat: number, lng: number): number {
  const jd = julian(d)
  const n = jd - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = ((357.528 + 0.9856003 * n) % 360) * rad
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad
  const eps = (23.439 - 0.0000004 * n) * rad
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda))
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda))
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24
  const lst = (gmst * 15 + lng) * rad
  const ha = lst - ra
  const alt = Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(ha))
  return alt / rad
}

/** Sunrise/sunset (sun centre at −0.833°) found by scanning the local day. */
export function sunTimes(dayStart: Date, lat: number, lng: number): { rise?: Date; set?: Date } {
  let rise: Date | undefined
  let set: Date | undefined
  let prev = sunAltitude(dayStart, lat, lng)
  for (let m = 1; m <= 24 * 60; m++) {
    const t = new Date(dayStart.getTime() + m * 60000)
    const a = sunAltitude(t, lat, lng)
    if (prev < -0.833 && a >= -0.833 && !rise) rise = t
    if (prev >= -0.833 && a < -0.833 && rise && !set) set = t
    prev = a
  }
  return { rise, set }
}

/** Sky gradient for a sun altitude — night → twilight → golden → day. */
export function skyFor(alt: number): [string, string, string] {
  if (alt < -12) return ['#05090c', '#0b1620', '#10251F']
  if (alt < -4) return ['#0c1630', '#2b2a4a', '#6b4a5a']
  if (alt < 2) return ['#2d3a66', '#c0697a', '#E8B86D']
  if (alt < 10) return ['#5f86b8', '#e7a873', '#f3d6a1']
  return ['#4d8ed1', '#9cc6e8', '#dfeef5']
}
