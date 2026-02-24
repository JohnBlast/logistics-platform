/** UK Hubs — static lookup of ~30-35 cities with lat/lng (PRD §9) */

export interface HubCoord {
  lat: number
  lng: number
}

export const UK_HUBS: Record<string, HubCoord> = {
  London: { lat: 51.507, lng: -0.128 },
  Birmingham: { lat: 52.486, lng: -1.89 },
  Manchester: { lat: 53.481, lng: -2.243 },
  Leeds: { lat: 53.801, lng: -1.549 },
  Glasgow: { lat: 55.864, lng: -4.252 },
  Liverpool: { lat: 53.408, lng: -2.992 },
  Bristol: { lat: 51.455, lng: -2.587 },
  Newcastle: { lat: 54.978, lng: -1.617 },
  Edinburgh: { lat: 55.953, lng: -3.188 },
  Cardiff: { lat: 51.481, lng: -3.179 },
  Sheffield: { lat: 53.381, lng: -1.47 },
  Nottingham: { lat: 52.954, lng: -1.158 },
  Southampton: { lat: 50.91, lng: -1.404 },
  Daventry: { lat: 52.258, lng: -1.161 },
  Northampton: { lat: 52.24, lng: -0.897 },
  'Milton Keynes': { lat: 52.04, lng: -0.759 },
  Doncaster: { lat: 53.523, lng: -1.132 },
  Wakefield: { lat: 53.683, lng: -1.497 },
  Warrington: { lat: 53.39, lng: -2.597 },
  Felixstowe: { lat: 51.954, lng: 1.351 },
  Dover: { lat: 51.127, lng: 1.313 },
  Immingham: { lat: 53.617, lng: -0.217 },
  Tilbury: { lat: 51.462, lng: 0.354 },
  Hull: { lat: 53.745, lng: -0.336 },
  Leicester: { lat: 52.636, lng: -1.139 },
  Derby: { lat: 52.922, lng: -1.477 },
  Exeter: { lat: 50.718, lng: -3.534 },
  Plymouth: { lat: 50.375, lng: -4.143 },
  Norwich: { lat: 52.63, lng: 1.297 },
  Ipswich: { lat: 52.059, lng: 1.155 },
  Reading: { lat: 51.454, lng: -0.978 },
  Swindon: { lat: 51.555, lng: -1.78 },
  Peterborough: { lat: 52.573, lng: -0.248 },
}

export function getHubNames(): string[] {
  return Object.keys(UK_HUBS)
}

export function getHubCoord(city: string): HubCoord | undefined {
  return UK_HUBS[city]
}

/** Normalise city name for lookup (handles slight variations) */
export function lookupHub(city: string): HubCoord | undefined {
  const trimmed = city.trim()
  return UK_HUBS[trimmed] ?? UK_HUBS[trimmed.replace(/\s+/g, '_')]
}
