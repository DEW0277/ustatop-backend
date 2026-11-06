// Usta profili turi — backend `MasterType` enum bilan bir xil bo'lishi shart (docs/TZ.md §4.4).
export const MASTER_TYPES = ['MASTER', 'FUEL_STATION', 'PARTS_SHOP'] as const;
export type MasterType = (typeof MASTER_TYPES)[number];

export const MASTER_TYPE_LABELS: Record<MasterType, string> = {
  MASTER: 'Usta',
  FUEL_STATION: "Yoqilg'i shoxobchasi",
  PARTS_SHOP: "Zapchast do'koni",
};
