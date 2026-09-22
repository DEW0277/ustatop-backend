import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { deleteOrConflict } from './delete-or-conflict.js';

function fkError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
    code: 'P2003',
    clientVersion: '6.19.3',
  });
}

describe('deleteOrConflict', () => {
  it('muvaffaqiyatli amalning natijasini qaytaradi', async () => {
    const result = await deleteOrConflict(() => Promise.resolve({ id: '1' }), 'xabar');

    expect(result).toEqual({ id: '1' });
  });

  it('P2003 (FK) xatosini ConflictExceptionga aylantiradi', async () => {
    await expect(deleteOrConflict(() => Promise.reject(fkError()), "Bog'liq qatorlar mavjud")).rejects.toThrow(
      ConflictException,
    );
  });

  it("boshqa xatolarni o'zgartirmasdan qayta tashlaydi", async () => {
    const other = new Error('boshqa sabab');

    await expect(deleteOrConflict(() => Promise.reject(other), 'xabar')).rejects.toBe(other);
  });
});
