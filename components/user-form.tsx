'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

const userSchema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  password: z.string().min(8, 'At least 8 characters'),
})

type UserFormValues = z.infer<typeof userSchema>

export function UserForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(userSchema) as any,
    defaultValues: { username: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      reset()
      setOpen(false)
      router.refresh()
    },
  })

  const f = 'bg-[#09090b] border-[#1c1c1c] text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-sky-500'
  const lbl = 'text-xs font-medium text-zinc-400'
  const err = 'text-xs text-red-400 mt-1'

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { reset(); mutation.reset() } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150">
          <Plus size={14} className="mr-1.5" /> New User
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#111111] border-[#1c1c1c]">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">New admin user</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
          <div className="space-y-1.5">
            <Label className={lbl}>Username</Label>
            <Input {...register('username')} className={f} placeholder="e.g. moataz" autoComplete="off" />
            {errors.username && <p className={err}>{errors.username.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className={lbl}>Password</Label>
            <Input {...register('password')} type="password" className={f} placeholder="••••••••" autoComplete="new-password" />
            {errors.password && <p className={err}>{errors.password.message}</p>}
          </div>

          {mutation.isError && (
            <p className={err.replace('mt-1', '') + ' bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2'}>
              {(mutation.error as Error)?.message ?? 'Failed to create user.'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-sky-500 hover:bg-sky-600 text-white cursor-pointer transition-colors duration-150"
            >
              {mutation.isPending ? 'Creating…' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
