import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { loadShapeCollections } from '@/lib/shapefiles'
import { BASE_URL } from '@/lib/api'
import { useCoordinateStream } from '../hooks/useCoordinateStream'
import type { CoordinateStreamParams } from '@/types'

interface Props {
  filters: CoordinateStreamParams
  enabled: boolean
  onStreamingChange?: (streaming: boolean) => void
}

export function OrdersMap({ filters, enabled, onStreamingChange }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const zonesLayerRef = useRef<L.LayerGroup | null>(null)
  const [shapesLoading, setShapesLoading] = useState(false)
  const [shapesError, setShapesError] = useState<string | null>(null)

  const { points, isStreaming, error: streamError } = useCoordinateStream(filters, enabled)

  // Notify parent when streaming state changes
  useEffect(() => {
    onStreamingChange?.(isStreaming)
  }, [isStreaming, onStreamingChange])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, { preferCanvas: true }).setView([42.95, -75.6], 7)

    map.createPane('taxZonesPane')
    map.getPane('taxZonesPane')!.style.zIndex = '410'
    map.createPane('ordersMarkersPane')
    map.getPane('ordersMarkersPane')!.style.zIndex = '620'

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    zonesLayerRef.current = L.layerGroup().addTo(map)
    markersLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
      zonesLayerRef.current = null
    }
  }, [])

  // Load shapefile boundaries
  useEffect(() => {
    if (!mapRef.current || !zonesLayerRef.current) return
    let cancelled = false

    async function load() {
      setShapesLoading(true)
      setShapesError(null)
      try {
        const { counties, cities } = await loadShapeCollections(BASE_URL)
        if (cancelled || !zonesLayerRef.current || !mapRef.current) return

        zonesLayerRef.current.clearLayers()
        const layerGroups: L.GeoJSON[] = []

        for (const collection of counties) {
          layerGroups.push(
            L.geoJSON(collection, {
              pane: 'taxZonesPane',
              style: { color: '#1d4ed8', weight: 2, fill: false },
            }).addTo(zonesLayerRef.current),
          )
        }

        for (const collection of cities) {
          layerGroups.push(
            L.geoJSON(collection, {
              pane: 'taxZonesPane',
              style: { color: '#ea580c', weight: 1.6, fill: false },
            }).addTo(zonesLayerRef.current),
          )
        }

        const bounds = L.latLngBounds([])
        for (const layer of layerGroups) {
          const layerBounds = layer.getBounds()
          if (layerBounds.isValid()) bounds.extend(layerBounds)
        }
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [20, 20] })
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          setShapesError(`Failed to load shapefiles: ${message}`)
        }
      } finally {
        if (!cancelled) setShapesLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Render streaming markers
  useEffect(() => {
    if (!markersLayerRef.current) return
    markersLayerRef.current.clearLayers()

    for (const point of points) {
      L.circleMarker([point.lat, point.lon], {
        pane: 'ordersMarkersPane',
        radius: 4,
        color: '#ffffff',
        weight: 1,
        fillColor: '#22c55e',
        fillOpacity: 0.8,
      }).addTo(markersLayerRef.current)
    }
  }, [points])

  // Invalidate map size when becoming visible
  useEffect(() => {
    if (!enabled || !mapRef.current) return
    const timer = window.setTimeout(() => {
      mapRef.current?.invalidateSize()
    }, 100)
    return () => window.clearTimeout(timer)
  }, [enabled])

  return (
    <div className="relative rounded-xl border border-border bg-background overflow-hidden" style={{ height: 540 }}>
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Loading overlay */}
      {shapesLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/65 text-sm text-muted-foreground z-[1000]">
          Loading shapefiles...
        </div>
      )}

      {/* Error banner */}
      {(shapesError || streamError) && (
        <div className="absolute inset-x-4 top-4 rounded-md border border-destructive/30 bg-background px-3 py-2 text-xs text-destructive shadow z-[1000]">
          {shapesError || streamError}
        </div>
      )}

      {/* Point count badge */}
      <div className="absolute top-3 right-3 z-[1000] rounded-md bg-card/90 border border-border px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
        {isStreaming ? (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-chart-1 animate-pulse" />
            {points.length.toLocaleString()} points
          </span>
        ) : (
          <span>{points.length.toLocaleString()} points</span>
        )}
      </div>
    </div>
  )
}
