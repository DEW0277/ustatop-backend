'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
import type { ManagedUser } from '@/lib/types';
import { USERS_QUERY_KEY } from './users-query';

export function BlockUserAction({ user }: { user: ManagedUser }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const nextBlocked = !user.isBlocked;

  const mutation = useMutation({
    mutationFn: () => api(`/admin/users/${user.id}/block`, { method: 'PATCH', body: { isBlocked: nextBlocked } }),
    onSuccess: () => {
      toast.success(nextBlocked ? "Foydalanuvchi bloklandi" : 'Blokdan chiqarildi');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Kutilmagan xatolik');
    },
  });

  // Adminlar bu amal orqali bloklanmaydi — tugma ADMIN qatorida umuman ko'rinmaydi.
  if (user.role === 'ADMIN') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={nextBlocked ? 'destructive' : 'outline'} size="sm">
            {nextBlocked ? 'Bloklash' : 'Blokdan chiqarish'}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nextBlocked ? "Foydalanuvchini bloklaysizmi?" : 'Blokdan chiqarilsinmi?'}</DialogTitle>
          <DialogDescription>
            {user.name} ({user.phone}){' '}
            {nextBlocked
              ? "endi tizimga kira olmaydi. Buni istalgan vaqt bekor qilishingiz mumkin."
              : 'tizimga qayta kira oladigan bo\'ladi.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button variant={nextBlocked ? 'destructive' : 'default'} disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Saqlanmoqda...' : 'Tasdiqlash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
