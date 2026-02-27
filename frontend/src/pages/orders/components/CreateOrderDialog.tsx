import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrderDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const { preview, error: previewError, loading: previewLoading, send, clear } = useTaxPreview()

  const form = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
      subtotal: undefined as unknown as number,
      timestamp: new Date().toISOString().slice(0, 16),
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
    }
  }, [open, form, clear])

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
            <div className="grid grid-cols-2 gap-3">
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
            </div>

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
    </Dialog>
  )
}
