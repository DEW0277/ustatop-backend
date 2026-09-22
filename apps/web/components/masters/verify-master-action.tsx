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
import { PENDING_MASTERS_QUERY_KEY } from './masters-query';

export function VerifyMasterAction({ master }: { master: PendingMaster }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api(`/admin/masters/${master.id}/verify`, {
        method: 'PATCH',
        body: { isVerified: true },
      }),
    onSuccess: () => {
      toast.success("Usta muvaffaqiyatli tasdiqlandi");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: PENDING_MASTERS_QUERY_KEY });
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
          <Button variant="default" size="sm">
            Tasdiqlash
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ustani tasdiqlaysizmi?</DialogTitle>
          <DialogDescription>
            {master.fullName} ({master.phone}) profilini tasdiqlash. Shundan so&apos;ng
            usta barcha foydalanuvchilarga tasdiqlangan belgi bilan ko&apos;rinadi.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            variant="default"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Tasdiqlanmoqda...' : 'Tasdiqlash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
