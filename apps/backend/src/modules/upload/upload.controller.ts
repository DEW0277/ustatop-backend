import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import 'multer';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { UploadResponseDto } from './dto/upload-response.dto.js';
import { MAX_FILE_SIZE } from './upload.constants.js';
import { UploadService } from './upload.service.js';

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  )
  @ApiOperation({
    summary: 'Bitta rasm yuklash (JPEG, PNG, WEBP — maks. 10MB)',
    description:
      "Rasm MinIO S3 omboriga yuklanadi va public URL manzili qaytariladi. Faqat autentifikatsiyadan o'tgan foydalanuvchilar uchun.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Yuklanadigan rasm fayli (JPEG, PNG, WEBP, max 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Rasm muvaffaqiyatli yuklandi',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Fayl yuborilmagan yoki noto'g'ri format (faqat JPEG, PNG, WEBP)",
  })
  @ApiResponse({
    status: 413,
    description: 'Fayl hajmi 10MB dan oshmasligi kerak',
  })
  @ResponseMessage('Fayl muvaffaqiyatli yuklandi')
  async uploadSingle(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.uploadService.uploadSingle(file);
  }
}
