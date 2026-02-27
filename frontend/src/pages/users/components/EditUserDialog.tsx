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
  FormDescription,
} from '@/components/ui/form'
import { usersApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import { editUserSchema, VALID_AUTHORITIES, type EditUserFormValues } from '../schemas'
import type { User } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}

export function EditUserDialog({ open, onOpenChange, user }: Props) {
  const queryClient = useQueryClient()

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    values: {
      login: user.login,
      password: '',
      full_name: user.full_name ?? '',
      is_active: user.is_active,
      authorities: user.authorities as EditUserFormValues['authorities'],
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EditUserFormValues) =>
      usersApi.update(user.id, {
        login: data.login !== user.login ? data.login : undefined,
        password: data.password || null,
        full_name: data.full_name || null,
        is_active: data.is_active,
        authorities: data.authorities,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      onOpenChange(false)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          form.setError('login', { message: 'Login already taken' })
        } else {
          form.setError('root', { message: err.detail })
        }
      } else {
        toast.error('Failed to update user')
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
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
                  <FormControl><Input type="password" placeholder="Leave blank to keep current" {...field} /></FormControl>
                  <FormDescription>Only fill to change the password</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
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
                            field.onChange(
                              checked
                                ? [...current, auth]
                                : current.filter((a: string) => a !== auth),
                            )
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-mono">{auth}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
