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
import type { AdminReview } from '@/lib/types';
import { REVIEWS_QUERY_KEY } from './reviews-query';

export function DeleteReviewAction({ review }: { review: AdminReview }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api(`/admin/reviews/${review.id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success("Sharh muvaffaqiyatli o'chirildi");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
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
          <Button variant="destructive" size="sm" className="gap-1.5">
            <Trash2 className="h-4 w-4" />
            O&apos;chirish
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sharhni o&apos;chirasizmi?</DialogTitle>
          <DialogDescription>
            Ushbu sharh o&apos;chirilgach, usta reytingi va sharhlar soni avtomatik
            qayta hisoblanadi. Bu amalni bekor qilib bo&apos;lmaydi.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between font-medium">
            <span>Usta: {review.masterName}</span>
            <span className="text-amber-500 font-semibold">{review.rating} ★</span>
          </div>
          <div className="text-muted-foreground text-xs mt-0.5">
            Mijoz: {review.userName} ({review.userPhone})
          </div>
          <p className="mt-2 text-foreground italic break-words">
            &ldquo;{review.comment}&rdquo;
          </p>
        </div>

        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
