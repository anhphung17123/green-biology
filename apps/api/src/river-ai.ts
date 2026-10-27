import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { memoryStorage } from 'multer';
import { detectImageMime } from './recognition';
import { RiverAiService } from './river-ai.service';
import { SpeciesApiService } from './species-api.service';

class BiologyChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}

const supportedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];

@Controller()
export class RiverAiController {
  constructor(private readonly riverAi: RiverAiService, private readonly speciesApi: SpeciesApiService) {}

  @Post('chat-biology')
  async chatBiology(@Body() dto: BiologyChatDto) {
    const reply = await this.riverAi.chatBiology(dto.message.trim());
    return { reply };
  }

  @Post('classify-animal')
  @UseInterceptors(FileInterceptor('image', {
    storage: memoryStorage(),
    limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5242880), files: 1 },
    fileFilter: (_, file, callback) => supportedImageMimes.includes(file.mimetype)
      ? callback(null, true)
      : callback(new BadRequestException('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'), false),
  }))
  async classifyAnimal(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu ảnh cần phân loại.');
    const detectedMime = detectImageMime(file.buffer);
    if (!detectedMime || detectedMime !== file.mimetype) {
      throw new BadRequestException('Nội dung tệp không khớp định dạng ảnh JPEG, PNG hoặc WebP.');
    }
    return this.speciesApi.identify(file.buffer, detectedMime, file.originalname);
  }
}
