import proj4 from 'proj4'
import shp from 'shpjs'
import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'

type GeoCollection = FeatureCollection<Geometry, GeoJsonProperties>

export interface ShapeCollections {
  counties: GeoCollection[]
  cities: GeoCollection[]
}

const shapeCache = new Map<string, Promise<ShapeCollections>>()
let projectionInitialized = false

export function normalizeApiBaseUrl(apiBaseUrl: string) {
  return apiBaseUrl.replace(/\/+$/, '')
}

function isFeatureCollection(v: unknown): v is GeoCollection {
  return Boolean(v) && typeof v === 'object' && 'type' in (v as Record<string, unknown>) && (v as Record<string, unknown>).type === 'FeatureCollection'
}

function normalizeFeatureCollections(raw: unknown): GeoCollection[] {
  if (!raw || typeof raw !== 'object') return []
  if (isFeatureCollection(raw)) return [raw]
  if (Array.isArray(raw)) return raw.filter(isFeatureCollection)
  return Object.values(raw).filter(isFeatureCollection)
}

function transformCoordinates(coords: unknown, converter: (pair: [number, number]) => [number, number]): unknown {
  if (!Array.isArray(coords)) return coords
  if (coords.length === 0) return coords
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return converter([coords[0], coords[1]])
  }
  return coords.map((entry) => transformCoordinates(entry, converter))
}

function needsProjection(collection: GeoCollection): boolean {
  for (const feature of collection.features) {
    const geometry = feature.geometry
    if (!geometry || !('coordinates' in geometry)) continue

    const stack: unknown[] = [(geometry as { coordinates: unknown }).coordinates]
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

function convertGeoJsonToWgs84IfNeeded(collection: GeoCollection): GeoCollection {
  if (!needsProjection(collection)) return collection
  return {
    ...collection,
    features: collection.features.map((feature) => {
      const geometry = feature.geometry
      if (!geometry || !('coordinates' in geometry)) return feature
      return {
        ...feature,
        geometry: {
          ...geometry,
          coordinates: transformCoordinates(
            (geometry as { coordinates: unknown }).coordinates,
            (coord) => {
              const converted = proj4('EPSG:26918', 'EPSG:4326', coord)
              return [converted[0], converted[1]]
            },
          ),
        } as typeof geometry,
      }
    }),
  }
}

export function ensureProjection() {
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

export async function loadShapeCollections(apiBaseUrl: string): Promise<ShapeCollections> {
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
