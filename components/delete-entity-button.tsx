'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteEntityButton({ apiUrl, label }: { apiUrl: string; label: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      setOpen(false)
      router.refresh()
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-red-500 hover:text-red-400 hover:bg-red-950/40 cursor-pointer"
        >
          <Trash2 size={13} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[#111111] border-[#1c1c1c]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-50">Delete item?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-500">
            <strong className="text-zinc-300">{label}</strong> will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-[#1c1c1c] text-zinc-400 hover:bg-zinc-900 cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
