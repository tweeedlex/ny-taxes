import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { usersApi } from "@/lib/endpoints";
import { ApiError } from "@/lib/api";
import {
  editUserSchema,
  VALID_AUTHORITIES,
  type EditUserFormValues,
} from "../schemas";
import { withImpliedAuthorities, withoutDependentAuthorities } from "../utils/authority";
import type { User } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function EditUserDialog({ open, onOpenChange, user }: Props) {
  const queryClient = useQueryClient();

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    values: {
      login: user.login,
      password: "",
      full_name: user.full_name ?? "",
      is_active: user.is_active,
      authorities: user.authorities as EditUserFormValues["authorities"],
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          form.setError("login", { message: "Login already taken" });
        } else {
          form.setError("root", { message: err.detail });
        }
      } else {
        toast.error("Failed to update user");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`
          p-0 gap-0 flex flex-col

          /* === MOBILE: bottom-sheet (как на рефе) === */
          left-0 right-0 bottom-0 top-auto
          translate-x-0 translate-y-0
          w-full max-w-none
          h-auto max-h-[85dvh]
          rounded-t-2xl rounded-b-none
          border-t border-border


          data-[state=open]:slide-in-from-bottom
          data-[state=closed]:slide-out-to-bottom
          data-[state=open]:zoom-in-100
          data-[state=closed]:zoom-out-100

          sm:top-0 sm:bottom-0 sm:left-auto sm:right-0
          sm:h-[100dvh] sm:max-h-none
          sm:w-[min(96vw,560px)]
          sm:rounded-none sm:rounded-l-xl
          sm:border-t-0 sm:border-l sm:border-border

          sm:data-[state=open]:slide-in-from-right
          sm:data-[state=closed]:slide-out-to-right
        `}
      >
        <div className="sm:hidden pt-2 pb-1">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 py-5 border-b border-border">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base font-semibold leading-none">
                  <span className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    Edit User
                  </span>

                  <span className="truncate">
                    {user.full_name || user.login}
                  </span>
                </DialogTitle>


              </div>

            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Form {...form}>
            <form
              id="edit-user-form"
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
            >
              {/* Username + Full name */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Leave blank to keep current"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Only fill to change the password
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Permissions */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Permissions</p>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  {VALID_AUTHORITIES.map((auth) => (
                    <FormField
                      key={auth}
                      control={form.control}
                      name="authorities"
                      render={({ field }) => (
                        <FormItem
                          className="
                            flex items-center gap-2.5
                            rounded-lg border border-border
                            px-3 py-2.5 bg-card
                          "
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(auth)}
                              onCheckedChange={(checked) => {
                                const current = field.value ?? [];
                                if (checked) {
                                  const next = [...current, auth];
                                  field.onChange(withImpliedAuthorities(next, auth, VALID_AUTHORITIES));
                                } else {
                                  const next = current.filter((a: string) => a !== auth);
                                  field.onChange(withoutDependentAuthorities(next, auth));
                                }
                              }}
                            />
                          </FormControl>

                          <span className="size-2 rounded-full bg-muted-foreground/40" />

                          <FormLabel className="text-xs font-mono cursor-pointer leading-none">
                            {auth}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {form.formState.errors.root && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-background">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="edit-user-form"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="animate-spin w-3.5 h-3.5 mr-1" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
