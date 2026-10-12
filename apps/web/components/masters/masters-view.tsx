'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from 'cn';
import { AllMastersView } from './all-masters-view';
import { PendingMastersView } from './pending-masters-view';

export function MastersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAll = searchParams.get('view') === 'all';

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
            !isAll ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
          )}
        >
          Kutilayotganlar
        </button>
        <button
          type="button"
          onClick={() => router.replace(`${pathname}?view=all`, { scroll: false })}
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
            isAll ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
          )}
        >
          Barcha ustalar
        </button>
      </div>

      {isAll ? <AllMastersView /> : <PendingMastersView />}
    </div>
  );
}
