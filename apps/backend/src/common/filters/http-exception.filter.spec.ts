import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter.js';

function run(exception: unknown) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) };
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  new HttpExceptionFilter().catch(exception, host as never);

  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('HttpExceptionFilter', () => {
  it('HttpException statusi va xabarini saqlaydi', () => {
    const { status, body } = run(new BadRequestException('Xato'));

    expect(status).toBe(400);
    expect(body).toMatchObject({ success: false, message: 'Xato', statusCode: 400 });
  });

  it("multer 'File too large' xatosini 10MB xabariga o'giradi", () => {
    const { status, body } = run(new PayloadTooLargeException('File too large'));

    expect(status).toBe(413);
    expect(body.message).toBe('Fayl hajmi 10MB dan oshmasligi kerak');
  });

  it("boshqa 413 xatolari (masalan haddan katta JSON) fayl xabarini olmaydi", () => {
    const { body } = run(new PayloadTooLargeException('Boshqa sabab'));

    expect(body.message).toBe('Boshqa sabab');
  });

  it("body-parser (http-errors) 413 xatosi 500 emas, 413 bo'ladi", () => {
    const { status, body } = run(Object.assign(new Error('request entity too large'), { status: 413 }));

    expect(status).toBe(413);
    expect(body.message).toBe("So'rov hajmi juda katta");
  });

  it("kutilmagan xato 500 va umumiy xabar bilan qaytadi", () => {
    const { status, body } = run(new Error('db down'));

    expect(status).toBe(500);
    expect(body.message).toBe('Ichki server xatosi');
  });
});
