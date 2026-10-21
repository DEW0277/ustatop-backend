import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seedReferenceData } from './seed-reference.js';

const data = {
  regions: [
    { code: 'AAA', nameUz: 'Birinchi viloyat', nameRu: 'Первая область' },
    { code: 'BBB', nameUz: 'Ikkinchi viloyat', nameRu: 'Вторая область' },
  ],
  districtsByRegionCode: {
    AAA: [
      { nameUz: 'A tumani', nameRu: 'А район' },
      { nameUz: 'B tumani', nameRu: 'Б район' },
    ],
    BBB: [{ nameUz: 'C tumani', nameRu: 'В район' }],
  },
  categories: [
    { slug: 'one', nameUz: 'Bir', nameRu: 'Один', icon: 'i1', description: 'd1' },
    { slug: 'two', nameUz: 'Ikki', nameRu: 'Два', icon: 'i2', description: 'd2' },
  ],
};

function modelSpies() {
  return {
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };
}

function createFakes() {
  const tx = { region: modelSpies(), district: modelSpies(), category: modelSpies() };
  const db = {
    region: modelSpies(),
    district: modelSpies(),
    category: modelSpies(),
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown, _options?: unknown) => fn(tx)),
  };
  return { db, tx };
}

function expectNoMutatingCalls(...models: ReturnType<typeof modelSpies>[]) {
  for (const model of models) {
    expect(model.update).not.toHaveBeenCalled();
    expect(model.updateMany).not.toHaveBeenCalled();
    expect(model.upsert).not.toHaveBeenCalled();
    expect(model.delete).not.toHaveBeenCalled();
    expect(model.deleteMany).not.toHaveBeenCalled();
  }
}

describe('seedReferenceData', () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    fakes = createFakes();
  });

  it("bo'sh jadvallarda viloyat+tumanlarni tranzaksiya ichida, kategoriyalarni createMany bilan yaratadi", async () => {
    const result = await seedReferenceData(fakes.db as never, data);

    expect(result).toEqual({ regions: 'created', categories: 'created' });

    // Viloyatlar faqat tranzaksiya klienti orqali (db.region'ga tegilmaydi).
    expect(fakes.db.$transaction).toHaveBeenCalledTimes(1);
    expect(fakes.db.region.create).not.toHaveBeenCalled();
    expect(fakes.tx.region.create).toHaveBeenCalledTimes(data.regions.length);

    for (const [index, region] of data.regions.entries()) {
      const arg = fakes.tx.region.create.mock.calls[index][0];
      expect(arg.data.code).toBe(region.code);
      expect(arg.data.nameUz).toBe(region.nameUz);
      expect(arg.data.districts.createMany.data).toEqual(
        data.districtsByRegionCode[region.code as keyof typeof data.districtsByRegionCode],
      );
    }

    expect(fakes.db.category.createMany).toHaveBeenCalledTimes(1);
    expect(fakes.db.category.createMany).toHaveBeenCalledWith({ data: data.categories });
    expectNoMutatingCalls(fakes.db.region, fakes.db.district, fakes.db.category, fakes.tx.region, fakes.tx.district, fakes.tx.category);
  });

  it("viloyat jadvali bo'sh emas bo'lsa — hech narsa yozilmaydi (admin tahrirlari saqlanadi)", async () => {
    fakes.tx.region.count.mockResolvedValue(3);

    const result = await seedReferenceData(fakes.db as never, data);

    expect(result.regions).toBe('skipped');
    expect(fakes.tx.region.create).not.toHaveBeenCalled();
    expect(fakes.tx.district.create).not.toHaveBeenCalled();
    expect(fakes.tx.district.createMany).not.toHaveBeenCalled();
    expectNoMutatingCalls(fakes.db.region, fakes.db.district, fakes.tx.region, fakes.tx.district);
  });

  it("kategoriya jadvali bo'sh emas bo'lsa — kategoriya yozilmaydi, viloyatlar baribir yaratiladi", async () => {
    fakes.db.category.count.mockResolvedValue(8);

    const result = await seedReferenceData(fakes.db as never, data);

    expect(result).toEqual({ regions: 'created', categories: 'skipped' });
    expect(fakes.db.category.createMany).not.toHaveBeenCalled();
    expect(fakes.db.category.create).not.toHaveBeenCalled();
    expectNoMutatingCalls(fakes.db.category);
  });

  it("ikkala jadval to'la bo'lsa — butunlay o'tkazib yuboriladi", async () => {
    fakes.tx.region.count.mockResolvedValue(14);
    fakes.db.category.count.mockResolvedValue(8);

    expect(await seedReferenceData(fakes.db as never, data)).toEqual({ regions: 'skipped', categories: 'skipped' });
    expect(fakes.tx.region.create).not.toHaveBeenCalled();
    expect(fakes.db.category.createMany).not.toHaveBeenCalled();
  });

  it("tumani ro'yxatda yo'q viloyat bo'sh districts bilan yaratiladi", async () => {
    await seedReferenceData(fakes.db as never, { ...data, districtsByRegionCode: { AAA: data.districtsByRegionCode.AAA } });

    const second = fakes.tx.region.create.mock.calls[1][0];
    expect(second.data.code).toBe('BBB');
    expect(second.data.districts).toBeUndefined();
  });
});
