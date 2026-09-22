'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ApiError, api } from '@/lib/api-client';
import type { Region } from '@/lib/types';

export function DeleteRegionAction({ region }: { region: Region }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api(`/admin/regions/${region.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(`"${region.nameUz}" muvaffaqiyatli o'chirildi`);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "O'chirishda xatolik yuz berdi");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">O&apos;chirish</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Viloyatni o&apos;chirishni tasdiqlaysizmi?</DialogTitle>
          <DialogDescription>
            <strong>{region.nameUz}</strong> viloyati butunlay o&apos;chiriladi.
            Agar ushbu viloyatga bog&apos;langan tumanlar yoki ustalar mavjud bo&apos;lsa,
            tizim uni o&apos;chirishga ruxsat bermaydi.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "O'chirilmoqda..." : "Ha, o'chirish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
