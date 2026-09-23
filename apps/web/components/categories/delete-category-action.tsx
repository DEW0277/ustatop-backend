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
import type { Category } from '@/lib/types';

export function DeleteCategoryAction({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api(`/admin/categories/${category.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(`"${category.nameUz}" kategoriyasi muvaffaqiyatli o'chirildi`);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
          <DialogTitle>Kategoriyani o&apos;chirishni tasdiqlaysizmi?</DialogTitle>
          <DialogDescription>
            <strong>{category.nameUz}</strong> kategoriyasi butunlay o&apos;chiriladi.
            Agar ushbu kategoriyaga biriktirilgan ustalar yoki xizmatlar mavjud bo&apos;lsa,
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
