import type { PrismaClient } from '@prisma/client';

export interface ReferenceData {
  regions: readonly { code: string; nameUz: string; nameRu: string }[];
  districtsByRegionCode: Record<string, readonly { nameUz: string; nameRu: string }[]>;
  categories: readonly { slug: string; nameUz: string; nameRu: string; icon: string; description: string }[];
}

export interface ReferenceSeedResult {
  regions: 'created' | 'skipped';
  categories: 'created' | 'skipped';
}

// Ma'lumotnomalar (viloyat, tuman, kategoriya) FAQAT tegishli jadval bo'sh bo'lsa yaratiladi. Aks holda seed
// admin panel orqali qilingan tahrirlarni (nom, `code`, `slug`, o'chirilgan yozuvlar) bekor qilardi va dublikat
// yaratardi: tumanning kaliti yo'q, region `code` va kategoriya `slug` esa adminlar tomonidan o'zgartiriladi —
// shuning uchun `update: {}` bilan upsert ham, kalit bo'yicha "create-only" ham yetarli emas.
// Hech qachon update/upsert/delete chaqirilmaydi.
export async function seedReferenceData(db: PrismaClient, data: ReferenceData): Promise<ReferenceSeedResult> {
  // Viloyatlar va ularning tumanlari bitta tranzaksiyada: yarim yaratilgan holat qolmasin (keyingi ishga tushirishda
  // jadval bo'sh emas deb o'tkazib yuborilib, tumanlar yetishmay qolardi).
  const regions = await db.$transaction(
    async (tx) => {
      if ((await tx.region.count()) > 0) {
        return 'skipped' as const;
      }

      for (const region of data.regions) {
        const districts = data.districtsByRegionCode[region.code] ?? [];

        await tx.region.create({
          data: {
            ...region,
            ...(districts.length > 0 ? { districts: { createMany: { data: districts.map((d) => ({ ...d })) } } } : {}),
          },
        });
      }

      return 'created' as const;
    },
    { timeout: 30_000 },
  );

  let categories: ReferenceSeedResult['categories'] = 'skipped';

  if ((await db.category.count()) === 0) {
    await db.category.createMany({ data: data.categories.map((c) => ({ ...c })) });
    categories = 'created';
  }

  return { regions, categories };
}
