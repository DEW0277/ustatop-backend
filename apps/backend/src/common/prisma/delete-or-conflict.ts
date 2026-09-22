import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Prisma P2003: FK cheklovi buzilgan — masalan bog'liq qatorlar (ustalar, buyurtmalar, tumanlar)
// mavjud bo'lgan viloyat/tumanni o'chirishga urinish. Buni ushlamasak, filter bunday holatni
// oddiy HttpException deb bilmay, generic 500 ("Ichki server xatosi") qaytarardi — admin panel
// foydalanuvchisi sababini bilolmasdi.
export async function deleteOrConflict<T>(operation: () => Promise<T>, conflictMessage: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new ConflictException(conflictMessage);
    }
    throw error;
  }
}
