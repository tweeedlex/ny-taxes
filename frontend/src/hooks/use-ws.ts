import useWebSocket, { type Options } from 'react-use-websocket'

const WS_BASE_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'

export function useWs(path: string, options?: Options) {
  return useWebSocket(`${WS_BASE_URL}${path}`, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
    reconnectAttempts: 10,
    ...options,
  })
}
