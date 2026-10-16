'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api } from '@/lib/api-client';
import { formatDate, formatPrice } from '@/lib/format';
import { WEEK_DAYS, WEEK_DAY_LABELS, type WeekDay } from '@/lib/schemas/master-form';
import type { AdminMasterDetail, PendingMaster, PriceType } from '@/lib/types';
import { MASTERS_QUERY_KEY } from './masters-query';
import { VerifyMasterAction } from './verify-master-action';

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'Aniq narx',
  hourly: 'Soatbay',
  starting_at: "Boshlang'ich narx",
};

function formatWorkDays(days: string[]): string {
  const known = WEEK_DAYS.filter((day) => days.includes(day));
  if (known.length === WEEK_DAYS.length) return 'Har kuni';
  return known.map((day: WeekDay) => WEEK_DAY_LABELS[day]).join(', ') || '—';
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

// Tasdiqlashdan oldin moderator ustaning portfolio rasmlari, xizmatlari va ish vaqtini ko'ra olishi uchun (C-02).
export function MasterDetailDialog({ master }: { master: PendingMaster }) {
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: [...MASTERS_QUERY_KEY, 'detail', master.id],
    queryFn: () => api<AdminMasterDetail>(`/admin/masters/${master.id}`),
    enabled: open,
  });
  const detail = query.data;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Batafsil</Button>} />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{master.fullName}</DialogTitle>
          <DialogDescription>
            {master.phone}
            {master.telegram ? ` · TG: @${master.telegram.replace(/^@/, '')}` : ''}
          </DialogDescription>
        </DialogHeader>

        {query.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {query.isError && (
          <p className="text-sm text-destructive">
            {query.error instanceof ApiError ? query.error.message : 'Kutilmagan xatolik'}
          </p>
        )}

        {detail && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              {detail.isVerified ? (
                <Badge variant="outline" className="border-emerald-500 text-emerald-700">Tasdiqlangan</Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">Kutilmoqda</Badge>
              )}
              {detail.isBlocked && <Badge variant="destructive">Bloklangan</Badge>}
              {!detail.isAvailable && <Badge variant="outline">Band</Badge>}
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {detail.rating.toFixed(1)} ({detail.reviewCount})
              </Badge>
              <Badge variant="secondary">{detail.completedOrdersCount} ta bajarilgan buyurtma</Badge>
            </div>

            <p className="whitespace-pre-line text-sm leading-6">{detail.bio}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Hudud">
                {detail.region.nameUz}, {detail.district.nameUz}
                {detail.address ? `, ${detail.address}` : ''}
              </InfoRow>
              <InfoRow label="Tajriba">{detail.experienceYears} yil</InfoRow>
              <InfoRow label="Ish vaqti">
                {detail.workingHours.start} – {detail.workingHours.end} · {formatWorkDays(detail.workingHours.workDays)}
              </InfoRow>
              <InfoRow label="Kategoriyalar">
                {detail.categories.map((category) => category.nameUz).join(', ') || '—'}
              </InfoRow>
              <InfoRow label="Akkaunt ochilgan">{formatDate(detail.userCreatedAt)}</InfoRow>
              <InfoRow label="Usta profili yaratilgan">{formatDate(detail.createdAt)}</InfoRow>
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Xizmatlar ({detail.services.length})</h3>
              {detail.services.length === 0 ? (
                <p className="text-sm text-muted-foreground">Xizmatlar qo&apos;shilmagan</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {detail.services.map((service) => (
                    <li key={service.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>
                        {service.title}
                        <span className="ml-2 text-xs text-muted-foreground">{PRICE_TYPE_LABELS[service.priceType]}</span>
                      </span>
                      <span className="whitespace-nowrap font-medium">{formatPrice(service.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Portfolio ({detail.portfolioImages.length})</h3>
              {detail.portfolioImages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Rasmlar yuklanmagan</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {detail.portfolioImages.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      {/* Rasmlar fayl omboridan (domen muhitga qarab o'zgaradi) — next/image remotePatterns o'rniga oddiy img. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Portfolio rasmi" loading="lazy" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <DialogFooter showCloseButton>
          <VerifyMasterAction master={detail ?? master} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
