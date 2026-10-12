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
import type { PendingMaster } from '@/lib/types';
import { MASTERS_QUERY_KEY, PENDING_MASTERS_QUERY_KEY } from './masters-query';

export function VerifyMasterAction({ master }: { master: PendingMaster }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const nextVerifiedState = !master.isVerified;

  const mutation = useMutation({
    mutationFn: () =>
      api(`/admin/masters/${master.id}/verify`, {
        method: 'PATCH',
        body: { isVerified: nextVerifiedState },
      }),
    onSuccess: () => {
      toast.success(
        nextVerifiedState
          ? 'Usta muvaffaqiyatli tasdiqlandi'
          : 'Usta tasdiqi bekor qilindi',
      );
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: PENDING_MASTERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MASTERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats', 'dashboard'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Kutilmagan xatolik');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          master.isVerified ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Tasdiqni bekor qilish
            </Button>
          ) : (
            <Button variant="default" size="sm">
              Tasdiqlash
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {master.isVerified ? 'Tasdiqni bekor qilasizmi?' : 'Ustani tasdiqlaysizmi?'}
          </DialogTitle>
          <DialogDescription>
            {master.isVerified
              ? `${master.fullName} (${master.phone}) tasdiqlangan maqomini bekor qilish. Shundan so'ng usta yana kutilayotganlar ro'yxatiga o'tadi.`
              : `${master.fullName} (${master.phone}) profilini tasdiqlash. Shundan so'ng usta barcha foydalanuvchilarga tasdiqlangan belgi bilan ko'rinadi.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            variant={master.isVerified ? 'destructive' : 'default'}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? master.isVerified
                ? 'Bekor qilinmoqda...'
                : 'Tasdiqlanmoqda...'
              : master.isVerified
                ? 'Tasdiqni bekor qilish'
                : 'Tasdiqlash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
