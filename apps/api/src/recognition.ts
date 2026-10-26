import {
  BadGatewayException, BadRequestException, Controller, Get, HttpException, Post,
  ServiceUnavailableException, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { readFile, unlink } from 'node:fs/promises';
import OpenAI from 'openai';
import { PrismaService } from './prisma.service';
import { CurrentUser, JwtGuard, Roles, RolesGuard } from './auth';
import { mapOpenAIError } from './chat';

const imageMimes = ['image/jpeg', 'image/png', 'image/webp'] as const;
type SupportedImageMime = (typeof imageMimes)[number];
type Certainty = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type SpeciesPrediction = {
  identifiable: boolean;
  commonName: string | null;
  scientificName: string | null;
  organismGroup: string | null;
  identifyingFeatures: string[];
  habitat: string | null;
  certainty: Certainty;
  certaintyReason: string;
  limitations: string;
};

const resultSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    identifiable: { type: 'boolean' }, commonName: { type: ['string', 'null'] },
    scientificName: { type: ['string', 'null'] }, organismGroup: { type: ['string', 'null'] },
    identifyingFeatures: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    habitat: { type: ['string', 'null'] },
    certainty: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] },
    certaintyReason: { type: 'string' }, limitations: { type: 'string' },
  },
  required: ['identifiable', 'commonName', 'scientificName', 'organismGroup', 'identifyingFeatures', 'habitat', 'certainty', 'certaintyReason', 'limitations'],
};

export function detectImageMime(bytes: Buffer): SupportedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export function parseSpeciesPrediction(raw: string): SpeciesPrediction {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new BadGatewayException('OpenAI trả về kết quả nhận diện không hợp lệ.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadGatewayException('OpenAI trả về kết quả nhận diện không hợp lệ.');
  const item = value as Record<string, unknown>;
  const certaintyValues: Certainty[] = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
  const nullableString = (field: string) => item[field] === null || typeof item[field] === 'string';
  if (typeof item.identifiable !== 'boolean' || !nullableString('commonName') || !nullableString('scientificName') ||
    !nullableString('organismGroup') || !nullableString('habitat') || !Array.isArray(item.identifyingFeatures) ||
    !item.identifyingFeatures.every((feature) => typeof feature === 'string') || !certaintyValues.includes(item.certainty as Certainty) ||
    typeof item.certaintyReason !== 'string' || typeof item.limitations !== 'string') {
    throw new BadGatewayException('OpenAI trả về kết quả nhận diện không hợp lệ.');
  }
  const prediction = item as SpeciesPrediction;
  if (!prediction.identifiable) return { ...prediction, commonName: null, scientificName: null, certainty: 'UNKNOWN' };
  if (!prediction.commonName && !prediction.scientificName) throw new BadGatewayException('OpenAI không trả về tên dự đoán hợp lệ.');
  return prediction;
}

@Controller('species-recognition')
@UseGuards(JwtGuard, RolesGuard)
@Roles('STUDENT')
export class RecognitionController {
  constructor(private db: PrismaService) {}

  @Get('mine')
  history(@CurrentUser() user: { sub: string }) {
    return this.db.speciesIdentification.findMany({ where: { userId: user.sub }, orderBy: { createdAt: 'desc' }, take: 20 });
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: process.env.UPLOAD_DIR || './uploads',
      filename: (_, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5242880), files: 1 },
    fileFilter: (_, file, callback) => imageMimes.includes(file.mimetype as SupportedImageMime)
      ? callback(null, true) : callback(new BadRequestException('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP'), false),
  }))
  async identify(@CurrentUser() user: { sub: string }, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu ảnh cần nhận diện');
    const bytes = await readFile(file.path);
    const detectedMime = detectImageMime(bytes);
    if (!detectedMime || detectedMime !== file.mimetype) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Nội dung tệp không khớp định dạng ảnh JPEG, PNG hoặc WebP');
    }

    const model = process.env.OPENAI_VISION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim();
    const pending = await this.db.speciesIdentification.create({
      data: { userId: user.sub, storageKey: file.filename, status: 'PROCESSING', provider: model ? `OpenAI ${model}` : 'OpenAI' },
    });
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey || !model) {
      const message = !apiKey
        ? 'OpenAI Vision chưa được cấu hình. Quản trị viên cần thiết lập OPENAI_API_KEY.'
        : 'OpenAI Vision chưa được cấu hình. Quản trị viên cần thiết lập OPENAI_VISION_MODEL.';
      await this.db.speciesIdentification.update({ where: { id: pending.id }, data: { status: 'FAILED', error: message } });
      throw new ServiceUnavailableException(message);
    }

    try {
      const client = new OpenAI({ apiKey, timeout: Number(process.env.OPENAI_TIMEOUT_MS || 30000), maxRetries: 1 });
      const response = await client.responses.create({
        model,
        instructions: [
          'Bạn là trợ lý nhận diện thực vật và động vật cho học sinh THPT.',
          'Chỉ dựa trên chi tiết thực sự nhìn thấy trong ảnh. Không suy đoán tình trạng bảo tồn.',
          'Chỉ nêu tên loài khi ảnh có đủ đặc điểm phân biệt; nếu chỉ xác định được nhóm, ảnh mờ, bị che khuất hoặc không phải sinh vật thì identifiable=false và để cả hai tên là null.',
          'Môi trường sống phải là mô tả chung của loài dự đoán và cần nói rõ giới hạn nếu vị trí chụp không thể suy ra từ ảnh.',
          'Mức chắc chắn là tự đánh giá định tính, không phải xác suất khoa học.',
          'Trả lời bằng tiếng Việt, ngắn gọn và không bịa thông tin.',
        ].join(' '),
        input: [{ role: 'user', content: [
          { type: 'input_text', text: 'Phân tích ảnh này để nhận diện sơ bộ thực vật hoặc động vật.' },
          { type: 'input_image', image_url: `data:${detectedMime};base64,${bytes.toString('base64')}`, detail: 'high' },
        ] }],
        text: { format: { type: 'json_schema', name: 'species_identification', strict: true, schema: resultSchema }, verbosity: 'low' },
        max_output_tokens: 700,
      });
      if (!response.output_text?.trim()) throw new BadGatewayException('OpenAI không trả về kết quả nhận diện.');
      const prediction = parseSpeciesPrediction(response.output_text);
      const species = prediction.scientificName ? await this.db.species.findFirst({
        where: { scientificName: { equals: prediction.scientificName, mode: 'insensitive' } }, include: { source: true },
      }) : null;
      const updated = await this.db.speciesIdentification.update({
        where: { id: pending.id },
        data: { status: 'COMPLETED', predictionName: prediction.scientificName || prediction.commonName, confidence: null, speciesId: species?.id, error: null },
      });
      return { identification: updated, prediction, warning: 'Kết quả OpenAI Vision chỉ là nhận diện sơ bộ, không phải kết luận khoa học.', species };
    } catch (error) {
      const mapped = error instanceof HttpException ? error : mapOpenAIError(error, 'Nhận diện loài');
      await this.db.speciesIdentification.update({ where: { id: pending.id }, data: { status: 'FAILED', error: mapped.message } });
      throw mapped;
    }
  }
}
