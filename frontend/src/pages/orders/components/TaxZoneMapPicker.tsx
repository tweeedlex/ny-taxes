import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import proj4 from 'proj4'
import shp from 'shpjs'
import 'leaflet/dist/leaflet.css'

interface PickedPoint {
  latitude: number
  longitude: number
}

interface TaxZoneMapPickerProps {
  open: boolean
  apiBaseUrl: string
  selectedPoint: PickedPoint | null
  onPick: (point: PickedPoint) => void
}

interface ShapeCollections {
  counties: any[]
  cities: any[]
}

const shapeCache = new Map<string, Promise<ShapeCollections>>()
let projectionInitialized = false

function normalizeApiBaseUrl(apiBaseUrl: string) {
  return apiBaseUrl.replace(/\/+$/, '')
}

function normalizeFeatureCollections(raw: unknown): any[] {
  if (!raw || typeof raw !== 'object') return []
  if ('type' in raw && raw.type === 'FeatureCollection') {
    return [raw as any]
  }
  if (Array.isArray(raw)) {
    return raw.filter(
      (entry): entry is any =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        'type' in entry &&
        entry.type === 'FeatureCollection',
    )
  }
  return Object.values(raw).filter(
    (entry): entry is any =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      'type' in entry &&
      entry.type === 'FeatureCollection',
  )
}

function transformCoordinates(coords: unknown, converter: (pair: [number, number]) => [number, number]): unknown {
  if (!Array.isArray(coords)) return coords
  if (coords.length === 0) return coords
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return converter([coords[0], coords[1]])
  }
  return coords.map((entry) => transformCoordinates(entry, converter))
}

function needsProjection(collection: any): boolean {
  for (const feature of collection.features ?? []) {
    const geometry = feature.geometry
    if (!geometry || !('coordinates' in geometry)) continue

    const stack: unknown[] = [geometry.coordinates]
    while (stack.length > 0) {
      const current = stack.pop()
      if (!Array.isArray(current) || current.length === 0) continue
      if (typeof current[0] === 'number' && typeof current[1] === 'number') {
        const x = Number(current[0])
        const y = Number(current[1])
        if (Math.abs(x) > 180 || Math.abs(y) > 90) return true
        break
      }
      stack.push(...current)
    }
  }
  return false
}

function convertGeoJsonToWgs84IfNeeded(collection: any): any {
  if (!needsProjection(collection)) return collection
  return {
    ...collection,
    features: (collection.features ?? []).map((feature) => {
      const geometry = feature.geometry
      if (!geometry || !('coordinates' in geometry)) return feature
      return {
        ...feature,
        geometry: {
          ...geometry,
          coordinates: transformCoordinates(geometry.coordinates, (coord) => {
            const converted = proj4('EPSG:26918', 'EPSG:4326', coord)
            return [converted[0], converted[1]]
          }),
        },
      }
    }),
  }
}

function ensureProjection() {
  if (projectionInitialized) return
  proj4.defs('EPSG:26918', '+proj=utm +zone=18 +datum=NAD83 +units=m +no_defs +type=crs')
  projectionInitialized = true
}

async function loadShapefileCollections(apiBaseUrl: string, baseName: string) {
  const normalizedBase = normalizeApiBaseUrl(apiBaseUrl)
  const url = `${normalizedBase}/static/shapefiles/${baseName}.shp`
  const raw = await shp(url)
  return normalizeFeatureCollections(raw).map(convertGeoJsonToWgs84IfNeeded)
}

async function loadShapeCollections(apiBaseUrl: string) {
  ensureProjection()
  const normalizedBase = normalizeApiBaseUrl(apiBaseUrl)
  const cacheKey = normalizedBase
  if (!shapeCache.has(cacheKey)) {
    shapeCache.set(
      cacheKey,
      Promise.all([
        loadShapefileCollections(normalizedBase, 'Counties'),
        loadShapefileCollections(normalizedBase, 'Cities'),
      ]).then(([counties, cities]) => ({ counties, cities })),
    )
  }
  return shapeCache.get(cacheKey)!
}

function formatCoord(value: number) {
  return value.toFixed(6)
}

export function TaxZoneMapPicker({
  open,
  apiBaseUrl,
  selectedPoint,
  onPick,
}: TaxZoneMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const zonesLayerRef = useRef<L.LayerGroup | null>(null)
  const onPickRef = useRef(onPick)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedApiBase = useMemo(() => normalizeApiBaseUrl(apiBaseUrl), [apiBaseUrl])

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    if (!open || !mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, { preferCanvas: true }).setView([42.95, -75.6], 7)
    map.createPane('taxZonesPane')
    map.getPane('taxZonesPane')!.style.zIndex = '410'
    map.createPane('taxSelectedPointPane')
    map.getPane('taxSelectedPointPane')!.style.zIndex = '660'

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    zonesLayerRef.current = L.layerGroup().addTo(map)
    map.on('click', (event: L.LeafletMouseEvent) => {
      onPickRef.current({
        latitude: Number(event.latlng.lat.toFixed(8)),
        longitude: Number(event.latlng.lng.toFixed(8)),
      })
    })
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      zonesLayerRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open || !mapRef.current || !zonesLayerRef.current) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { counties, cities } = await loadShapeCollections(normalizedApiBase)
        if (cancelled || !zonesLayerRef.current || !mapRef.current) return

        zonesLayerRef.current.clearLayers()
        const layerGroups: L.GeoJSON[] = []

        for (const collection of counties) {
          layerGroups.push(
            L.geoJSON(collection, {
              pane: 'taxZonesPane',
              style: {
                color: '#1d4ed8',
                weight: 2,
                fill: false,
              },
            }).addTo(zonesLayerRef.current),
          )
        }

        for (const collection of cities) {
          layerGroups.push(
            L.geoJSON(collection, {
              pane: 'taxZonesPane',
              style: {
                color: '#ea580c',
                weight: 1.6,
                fill: false,
              },
            }).addTo(zonesLayerRef.current),
          )
        }

        const bounds = L.latLngBounds([])
        for (const layer of layerGroups) {
          const layerBounds = layer.getBounds()
          if (layerBounds.isValid()) {
            bounds.extend(layerBounds)
          }
        }
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [20, 20] })
        }
      } catch (loadError) {
        if (!cancelled) {
          const message = loadError instanceof Error ? loadError.message : String(loadError)
          setError(`Failed to load shapefiles: ${message}`)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, normalizedApiBase])

  useEffect(() => {
    if (!open || !mapRef.current) return
    const timer = window.setTimeout(() => {
      mapRef.current?.invalidateSize()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mapRef.current) return
    if (!selectedPoint) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }

    const latLng: L.LatLngExpression = [selectedPoint.latitude, selectedPoint.longitude]
    if (!markerRef.current) {
      markerRef.current = L.circleMarker(latLng, {
        pane: 'taxSelectedPointPane',
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#16a34a',
        fillOpacity: 0.95,
      }).addTo(mapRef.current)
    } else {
      markerRef.current.setLatLng(latLng)
    }
  }, [selectedPoint])

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="text-xs text-muted-foreground">
        Select a point on the map. Orange borders are cities, blue borders are counties.
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border">
        <div ref={mapContainerRef} className="h-full w-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/65 text-sm text-muted-foreground">
            Loading shapefiles...
          </div>
        )}
        {error && (
          <div className="absolute inset-x-4 top-4 rounded-md border border-destructive/30 bg-background px-3 py-2 text-xs text-destructive shadow">
            {error}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {selectedPoint
          ? `Selected: ${formatCoord(selectedPoint.latitude)}, ${formatCoord(selectedPoint.longitude)}`
          : 'No point selected yet'}
      </div>
    </div>
  )
}
