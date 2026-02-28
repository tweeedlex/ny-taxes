import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/Spinner'
import { ordersApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import { useTaxPreview } from '../hooks/useTaxPreview'
import { createOrderSchema, type CreateOrderFormValues } from '../schemas'
import { formatMoney, formatRate } from '../utils/formatters'
import { TaxZoneMapPicker } from './TaxZoneMapPicker'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PickedPoint {
  latitude: number
  longitude: number
}

const DEFAULT_LATITUDE = 40.74847198283615
const DEFAULT_LONGITUDE = -73.98567118261157
const DEFAULT_SUBTOTAL = 100

const DEFAULT_PICKED_POINT: PickedPoint = {
  latitude: DEFAULT_LATITUDE,
  longitude: DEFAULT_LONGITUDE,
}

function formatCoord(value: number) {
  return value.toFixed(6)
}

function getLocalDateTimeInputValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16)
}

function isValidCoordinatePair(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

export function CreateOrderDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [pickedPoint, setPickedPoint] = useState<PickedPoint | null>(DEFAULT_PICKED_POINT)
  const { preview, error: previewError, loading: previewLoading, send, clear } = useTaxPreview()
  const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

  const form = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      latitude: DEFAULT_LATITUDE,
      longitude: DEFAULT_LONGITUDE,
      subtotal: DEFAULT_SUBTOTAL,
      timestamp: getLocalDateTimeInputValue(new Date()),
    },
  })

  const watched = form.watch()

  useEffect(() => {
    if (!open) return
    send({
      latitude: Number(watched.latitude),
      longitude: Number(watched.longitude),
      subtotal: Number(watched.subtotal),
      timestamp: watched.timestamp ? new Date(watched.timestamp).toISOString() : '',
    })
  }, [watched.latitude, watched.longitude, watched.subtotal, watched.timestamp, open, send])

  useEffect(() => {
    if (!open) {
      form.reset()
      clear()
      setServerError(null)
      setMapOpen(false)
      setPickedPoint(DEFAULT_PICKED_POINT)
    }
  }, [open, form, clear])

  const openMapPicker = () => {
    const latitude = Number(form.getValues('latitude'))
    const longitude = Number(form.getValues('longitude'))
    if (isValidCoordinatePair(latitude, longitude)) {
      setPickedPoint({ latitude, longitude })
    } else {
      setPickedPoint(null)
    }
    setMapOpen(true)
  }

  const applyPickedPoint = () => {
    if (!pickedPoint) return
    const latitude = Number(pickedPoint.latitude.toFixed(8))
    const longitude = Number(pickedPoint.longitude.toFixed(8))
    form.setValue('latitude', latitude, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    form.setValue('longitude', longitude, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setMapOpen(false)
    toast.success('Coordinates selected from map')
  }

  const createMutation = useMutation({
    mutationFn: (data: CreateOrderFormValues) =>
      ordersApi.create({
        ...data,
        timestamp: new Date(data.timestamp).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders-stats'] })
      toast.success('Order created')
      onOpenChange(false)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.detail)
      } else {
        toast.error('Failed to create order')
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="40.7128"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-74.0060"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end col-span-full sm:col-span-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto gap-1.5"
                  onClick={openMapPicker}
                >
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>Pick on map</span>
                </Button>
              </div>
            </div>

            {pickedPoint && (
              <p className="text-xs text-muted-foreground">
                Selected on map: {formatCoord(pickedPoint.latitude)}, {formatCoord(pickedPoint.longitude)}
              </p>
            )}

            <FormField
              control={form.control}
              name="subtotal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtotal ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timestamp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timestamp</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Live tax preview */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 min-h-[80px]">
              <p className="text-xs font-medium text-muted-foreground">Tax Preview</p>
              {previewLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner className="h-3 w-3" /> Calculating...
                </div>
              )}
              {previewError && (
                <p className="text-xs text-destructive">{previewError}</p>
              )}
              {preview && !previewLoading && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code</span>
                    <span className="font-mono text-xs">{preview.reporting_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax Rate</span>
                    <span>{formatRate(preview.composite_tax_rate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatMoney(preview.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatMoney(preview.total_amount)}</span>
                  </div>
                </div>
              )}
              {!preview && !previewError && !previewLoading && (
                <p className="text-xs text-muted-foreground">
                  Enter coordinates and subtotal to see a live tax preview
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-sm font-medium text-destructive">{serverError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="animate-spin" />}
                Create Order
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="flex h-[82vh] w-[90vw] max-w-6xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle>Select Delivery Point On Map</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
            <div className="min-h-0 flex-1">
              <TaxZoneMapPicker
                open={mapOpen}
                apiBaseUrl={apiBaseUrl}
                selectedPoint={pickedPoint}
                onPick={setPickedPoint}
              />
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-2">
              <Button type="button" variant="outline" onClick={() => setMapOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={applyPickedPoint} disabled={!pickedPoint}>
                Use selected point
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
