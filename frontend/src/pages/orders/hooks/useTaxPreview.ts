import { useState, useRef, useCallback } from 'react'
import { useWs } from '@/hooks/use-ws'
import type { TaxPreviewWsMessage, TaxPreviewWsSuccess } from '@/types'

interface TaxPreviewInput {
  latitude: number
  longitude: number
  subtotal: number
  timestamp: string
}

function isValid(input: TaxPreviewInput): boolean {
  return (
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude) &&
    Number.isFinite(input.subtotal) &&
    input.subtotal >= 0 &&
    input.timestamp.length > 0
  )
}

export function useTaxPreview() {
  const [preview, setPreview] = useState<TaxPreviewWsSuccess['result'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const { sendJsonMessage } = useWs('/orders/tax/ws', {
    onMessage: (event) => {
      try {
        const msg: TaxPreviewWsMessage = JSON.parse(event.data)
        setLoading(false)
        if (msg.ok === true) {
          setPreview(msg.result)
          setError(null)
        } else if (msg.ok === false) {
          setPreview(null)
          setError(msg.error.detail)
        }
      } catch {
        // ignore parse errors
      }
    },
  })

  const send = useCallback(
    (input: TaxPreviewInput) => {
      clearTimeout(timerRef.current)

      if (!isValid(input)) {
        setPreview(null)
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      timerRef.current = setTimeout(() => {
        sendJsonMessage(input)
      }, 500)
    },
    [sendJsonMessage],
  )

  const clear = useCallback(() => {
    clearTimeout(timerRef.current)
    setPreview(null)
    setError(null)
    setLoading(false)
  }, [])

  return { preview, error, loading, send, clear }
}
