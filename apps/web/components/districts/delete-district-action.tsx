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
import type { District } from '@/lib/types';

export function DeleteDistrictAction({ district }: { district: District }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api(`/admin/districts/${district.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(`"${district.nameUz}" muvaffaqiyatli o'chirildi`);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['districts'] });
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
          <DialogTitle>Tumanni o&apos;chirishni tasdiqlaysizmi?</DialogTitle>
          <DialogDescription>
            <strong>{district.nameUz}</strong> tumani butunlay o&apos;chiriladi.
            Agar ushbu tumanga bog&apos;langan ustalar yoki buyurtmalar mavjud bo&apos;lsa,
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
