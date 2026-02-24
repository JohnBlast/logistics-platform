/** UK Map — Leaflet + OSM, vehicle/load/collection/delivery pins, polylines (US5) */
import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, Polyline } from 'react-leaflet'
import L from 'leaflet'
import type { JobBoardLoad, Vehicle } from '../../lib/jobmarket/types'
import { getVehicleTypeLabel } from '../../lib/jobmarket/displayNames'
import { MapLegend } from './MapLegend'

const UK_BOUNDS: [[number, number], [number, number]] = [
  [49.9, -8.2],
  [60.9, 1.8],
]
const UK_CENTER: [number, number] = [53.0, -1.5]
const DEFAULT_ZOOM = 6

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function etaMinutes(km: number): number {
  return Math.round((km / 60) * 60)
}

const vehicleIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#1976d2;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:bold">V</div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})
const nearestVehicleIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#1976d2;width:22px;height:22px;border-radius:50%;border:3px solid #ffeb3b;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold">V</div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})
const collectionIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#2e7d32;width:20px;height:20px;border-radius:4px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold">C</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})
const deliveryIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#c62828;width:20px;height:20px;border-radius:4px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold">D</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function makeLoadIcon(selected: boolean) {
  const size = selected ? 24 : 18
  const bg = selected ? '#ff6f00' : '#ef6c00'
  const border = selected ? '3px solid #fff176' : '2px solid white'
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${bg};width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;border:${border};box-shadow:0 2px 6px rgba(0,0,0,0.4);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:white;font-size:${selected ? 11 : 9}px;font-weight:bold">L</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })
}

interface UKMapProps {
  job: JobBoardLoad | null
  jobs?: JobBoardLoad[]
  vehicles: Vehicle[]
  hubs: Record<string, { lat: number; lng: number }>
  className?: string
  onSelectJob?: (loadId: string) => void
  selectedJobId?: string | null
}

export function UKMap({ job, jobs, vehicles, hubs, className, onSelectJob, selectedJobId }: UKMapProps) {
  const [hoveredLoadPinCity, setHoveredLoadPinCity] = useState<string | null>(null)

  const vehiclePositions = useMemo(() => {
    return vehicles
      .map((v) => {
        const coord = hubs[v.current_city]
        if (!coord) return null
        return { ...v, lat: coord.lat, lng: coord.lng }
      })
      .filter(Boolean) as (Vehicle & { lat: number; lng: number })[]
  }, [vehicles, hubs])

  const activeJob = job

  const collectionCoord = activeJob ? hubs[activeJob.collection_city] : null
  const deliveryCoord = activeJob ? hubs[activeJob.delivery_city] : null

  const nearestVehicle = useMemo(() => {
    if (!activeJob || !collectionCoord || vehiclePositions.length === 0) return null
    let nearest = vehiclePositions[0]
    let minDist = haversineKm(
      nearest.lat,
      nearest.lng,
      collectionCoord.lat,
      collectionCoord.lng
    )
    for (const v of vehiclePositions) {
      const d = haversineKm(v.lat, v.lng, collectionCoord.lat, collectionCoord.lng)
      if (d < minDist) {
        minDist = d
        nearest = v
      }
    }
    return { vehicle: nearest, distKm: minDist }
  }, [activeJob, collectionCoord, vehiclePositions])

  const collectionToDeliveryLine = useMemo(() => {
    if (!collectionCoord || !deliveryCoord) return null
    const km = haversineKm(
      collectionCoord.lat,
      collectionCoord.lng,
      deliveryCoord.lat,
      deliveryCoord.lng
    )
    return {
      positions: [
        [collectionCoord.lat, collectionCoord.lng] as [number, number],
        [deliveryCoord.lat, deliveryCoord.lng] as [number, number],
      ],
      km,
      min: etaMinutes(km),
    }
  }, [collectionCoord, deliveryCoord])

  // Load pins — group by collection city
  const loadPins = useMemo(() => {
    if (!jobs || jobs.length === 0) return []
    const byCity = new Map<string, JobBoardLoad[]>()
    for (const j of jobs) {
      const coord = hubs[j.collection_city]
      if (!coord) continue
      const existing = byCity.get(j.collection_city)
      if (existing) {
        existing.push(j)
      } else {
        byCity.set(j.collection_city, [j])
      }
    }
    return Array.from(byCity.entries()).map(([city, cityJobs]) => ({
      city,
      coord: hubs[city],
      jobs: cityJobs,
    }))
  }, [jobs, hubs])

  // Polylines for hovered load pin (collection → delivery per job)
  const hoveredLoadLines = useMemo(() => {
    if (!hoveredLoadPinCity || !jobs) return []
    const pin = loadPins.find((p) => p.city === hoveredLoadPinCity)
    if (!pin) return []
    return pin.jobs
      .map((j) => {
        const from = hubs[j.collection_city]
        const to = hubs[j.delivery_city]
        if (!from || !to) return null
        return {
          key: j.load_id,
          positions: [[from.lat, from.lng] as [number, number], [to.lat, to.lng] as [number, number]],
        }
      })
      .filter(Boolean) as { key: string; positions: [number, number][] }[]
  }, [hoveredLoadPinCity, loadPins, jobs, hubs])

  return (
    <div className={className ?? 'h-64 w-full'}>
      <div className="relative h-full w-full">
        <MapContainer
          center={UK_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          maxBounds={UK_BOUNDS}
          maxBoundsViscosity={1}
        >
          <TileLayer url={OSM_URL} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />

          {/* Hovered load lines — collection → delivery when hovering a load pin */}
          {hoveredLoadLines.map((line) => (
            <Polyline
              key={line.key}
              positions={line.positions}
              pathOptions={{ color: '#ff9800', weight: 2, opacity: 0.8, dashArray: '6, 6' }}
            />
          ))}

          {/* Load pins — orange markers at collection cities */}
          {loadPins.map((pin) => {
            const hasSelected = pin.jobs.some((j) => j.load_id === selectedJobId)
            return (
              <Marker
                key={`load-${pin.city}`}
                position={[pin.coord.lat, pin.coord.lng]}
                icon={makeLoadIcon(hasSelected)}
                eventHandlers={{
                  mouseover: () => setHoveredLoadPinCity(pin.city),
                  mouseout: () => setHoveredLoadPinCity(null),
                  click: () => {
                    if (onSelectJob && pin.jobs.length > 0) {
                      if (pin.jobs.length === 1) {
                        onSelectJob(pin.jobs[0].load_id)
                      } else {
                        const currentIdx = pin.jobs.findIndex((j) => j.load_id === selectedJobId)
                        const nextIdx = (currentIdx + 1) % pin.jobs.length
                        onSelectJob(pin.jobs[nextIdx].load_id)
                      }
                    }
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent={false}>
                  <div style={{ minWidth: 160 }}>
                    <strong>{pin.city}</strong>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      {pin.jobs.length} job{pin.jobs.length !== 1 ? 's' : ''} available
                    </div>
                    {pin.jobs.map((j) => (
                      <div key={j.load_id} style={{ fontSize: 11, padding: '3px 0', borderTop: '1px solid #eee' }}>
                        {j.collection_city} &rarr; {j.delivery_city}
                        <br />
                        {j.distance_km} km · {j.required_vehicle_type ? getVehicleTypeLabel(j.required_vehicle_type) : '-'}
                        {j.max_budget !== undefined && <> · £{j.max_budget.toFixed(0)}</>}
                        {(j.quote_count ?? 0) > 0 && <> · {j.quote_count} quote{(j.quote_count ?? 0) !== 1 ? 's' : ''}</>}
                      </div>
                    ))}
                  </div>
                </Tooltip>
              </Marker>
            )
          })}

          {/* Vehicle markers */}
          {vehiclePositions.map((v) => {
            const isNearest = nearestVehicle?.vehicle.vehicle_id === v.vehicle_id
            return (
              <Marker
                key={v.vehicle_id}
                position={[v.lat, v.lng]}
                icon={isNearest ? nearestVehicleIcon : vehicleIcon}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <strong>{getVehicleTypeLabel(v.vehicle_type)}</strong><br />
                  {v.registration_number}<br />
                  {v.current_city}
                  {isNearest && <><br /><em>(nearest to collection)</em></>}
                </Tooltip>
              </Marker>
            )
          })}

          {/* Selected job collection/delivery markers */}
          {collectionCoord && (
            <Marker position={[collectionCoord.lat, collectionCoord.lng]} icon={collectionIcon}>
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                Collection: {activeJob?.collection_city}
              </Tooltip>
            </Marker>
          )}
          {deliveryCoord && (
            <Marker position={[deliveryCoord.lat, deliveryCoord.lng]} icon={deliveryIcon}>
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                Delivery: {activeJob?.delivery_city}
              </Tooltip>
            </Marker>
          )}

          {/* Polylines from all vehicles to collection */}
          {collectionCoord && vehiclePositions.map((v) => {
            const isNearest = nearestVehicle?.vehicle.vehicle_id === v.vehicle_id
            const dist = haversineKm(v.lat, v.lng, collectionCoord.lat, collectionCoord.lng)
            return (
              <Polyline
                key={`line-${v.vehicle_id}`}
                positions={[
                  [v.lat, v.lng] as [number, number],
                  [collectionCoord.lat, collectionCoord.lng] as [number, number],
                ]}
                pathOptions={{
                  color: '#1976d2',
                  dashArray: '5, 10',
                  weight: isNearest ? 3 : 1,
                  opacity: isNearest ? 0.8 : 0.2,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  {getVehicleTypeLabel(v.vehicle_type)} ({v.registration_number})<br />
                  ~{dist.toFixed(0)} km, ~{etaMinutes(dist)} min to collection
                  {isNearest && ' (nearest)'}
                </Tooltip>
              </Polyline>
            )
          })}
          {collectionToDeliveryLine && (
            <Polyline
              positions={collectionToDeliveryLine.positions}
              pathOptions={{ color: '#2e7d32', weight: 3 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                ~{collectionToDeliveryLine.km.toFixed(0)} km, ~{collectionToDeliveryLine.min} min
              </Tooltip>
            </Polyline>
          )}
        </MapContainer>
        <MapLegend showLoads={!!jobs && jobs.length > 0} />
      </div>
    </div>
  )
}
