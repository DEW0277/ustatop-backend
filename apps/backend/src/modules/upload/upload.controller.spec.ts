import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadController } from './upload.controller.js';
import { UploadService } from './upload.service.js';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: { uploadSingle: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    uploadService = {
      uploadSingle: vi.fn(),
    };
    controller = new UploadController(uploadService as unknown as UploadService);
  });

  it('faylni uploadSingle xizmatiga uzatadi va natijani qaytaradi', async () => {
    const mockFile = {
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 3,
    } as Express.Multer.File;

    const expectedResponse = {
      url: 'http://localhost:9000/ustatop-uploads/images/sample-uuid.jpg',
    };
    uploadService.uploadSingle.mockResolvedValueOnce(expectedResponse);

    const result = await controller.uploadSingle(mockFile);

    expect(uploadService.uploadSingle).toHaveBeenCalledWith(mockFile);
    expect(result).toEqual(expectedResponse);
  });
});
