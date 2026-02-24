/** Haversine distance and ETA utilities (PRD §9) */

const EARTH_RADIUS_KM = 6371

/**
 * Haversine formula — straight-line distance between two points in km
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * ETA in minutes at ~60 km/h average road speed
 * Formula: distance_km / 60 * 60 = distance_km (PRD §9)
 */
export function estimateETA(distanceKm: number): number {
  return Math.round((distanceKm / 60) * 60)
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
