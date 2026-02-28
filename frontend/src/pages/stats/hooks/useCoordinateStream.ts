import { useEffect, useMemo, useRef, useState } from 'react'
import { ordersApi } from '@/lib/endpoints'
import type { CoordinateStreamParams, OrderCoordinatePoint } from '@/types'

interface UseCoordinateStreamResult {
  points: OrderCoordinatePoint[]
  isStreaming: boolean
  error: string | null
}

export function useCoordinateStream(
  params: CoordinateStreamParams,
  enabled: boolean,
): UseCoordinateStreamResult {
  const [points, setPoints] = useState<OrderCoordinatePoint[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Stabilize params to avoid unnecessary re-streams
  const paramsKey = useMemo(() => JSON.stringify(params), [params])

  useEffect(() => {
    if (!enabled) return
    const currentParams: CoordinateStreamParams = JSON.parse(paramsKey)

    // Abort any previous stream
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPoints([])
    setIsStreaming(true)
    setError(null)

    let batch: OrderCoordinatePoint[] = []
    let rafId: number | null = null

    function flushBatch() {
      if (batch.length > 0) {
        const toAdd = batch
        batch = []
        setPoints((prev) => [...prev, ...toAdd])
      }
      rafId = null
    }

    async function stream() {
      try {
        const response = await ordersApi.streamCoordinates(currentParams)

        if (!response.ok) {
          let detail = response.statusText
          try {
            const json = await response.json()
            detail = json.detail ?? detail
          } catch {
            // ignore
          }
          throw new Error(detail)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
              const point = JSON.parse(trimmed) as OrderCoordinatePoint
              batch.push(point)
            } catch {
              // skip malformed lines
            }
          }

          // Flush batch on next animation frame for smooth rendering
          if (batch.length > 0 && rafId === null) {
            rafId = requestAnimationFrame(flushBatch)
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const point = JSON.parse(buffer.trim()) as OrderCoordinatePoint
            batch.push(point)
          } catch {
            // skip
          }
        }

        // Final flush
        flushBatch()
      } catch (err) {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
      } finally {
        if (!controller.signal.aborted) {
          setIsStreaming(false)
        }
      }
    }

    stream()

    return () => {
      controller.abort()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [enabled, paramsKey])

  return { points, isStreaming, error }
}
