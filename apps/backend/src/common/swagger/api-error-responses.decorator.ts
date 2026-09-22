import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

const DEFAULT_DESCRIPTIONS: Record<number, string> = {
  400: "Validatsiya xatosi yoki noto'g'ri so'rov",
  401: "Avtorizatsiyadan o'tilmagan yoki token yaroqsiz/bloklangan",
  403: "Ushbu amal uchun ruxsat yo'q (rol yoki resurs egaligi)",
  404: 'Resurs topilmadi',
  409: "Boshqa so'rov bilan ziddiyat (masalan parallel yangilanish)",
  413: 'Fayl yoki so‘rov hajmi juda katta',
  429: "So'rovlar soni juda ko'p, birozdan so'ng qayta urinib ko'ring",
};

// Barcha xato javoblari umumiy shaklda keladi: { success: false, message, statusCode, errors? }
// (`common/filters/http-exception.filter.ts`). Bu yerda faqat status+tavsif hujjatlanadi — aniq
// sxema emas, chunki xabar matni holatga qarab farqlanadi (masalan turli 400 sabablari).
export function ApiErrorResponses(...statuses: number[]) {
  return applyDecorators(
    ...statuses.map((status) => ApiResponse({ status, description: DEFAULT_DESCRIPTIONS[status] ?? 'Xatolik' })),
  );
}
