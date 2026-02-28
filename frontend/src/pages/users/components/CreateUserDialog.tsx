import { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { usersApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import { createUserSchema, VALID_AUTHORITIES, type CreateUserFormValues } from '../schemas'
import { withImpliedAuthorities, withoutDependentAuthorities } from '../utils/authority'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      login: '',
      password: '',
      full_name: '',
      is_active: true,
      authorities: [],
    },
  })

  const mutation = useMutation({
    mutationFn: (data: CreateUserFormValues) =>
      usersApi.create({
        login: data.login,
        password: data.password,
        full_name: data.full_name || null,
        is_active: data.is_active,
        authorities: data.authorities,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created')
      onOpenChange(false)
      form.reset()
      setServerError(null)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          form.setError('login', { message: 'Login already taken' })
        } else {
          setServerError(err.detail)
        }
      } else {
        toast.error('Failed to create user')
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login</FormLabel>
                  <FormControl><Input placeholder="username" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="At least 8 characters" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name (optional)</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className="text-sm">Active</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Authorities</p>
              {VALID_AUTHORITIES.map((auth) => (
                <FormField
                  key={auth}
                  control={form.control}
                  name="authorities"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(auth)}
                          onCheckedChange={(checked) => {
                            const current = field.value ?? []
                            if (checked) {
                              const next = [...current, auth]
                              field.onChange(withImpliedAuthorities(next, auth, VALID_AUTHORITIES))
                            } else {
                              const next = current.filter((a: string) => a !== auth)
                              field.onChange(withoutDependentAuthorities(next, auth))
                            }
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-mono">{auth}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                Create
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
