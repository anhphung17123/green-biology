import { BadGatewayException, BadRequestException, Controller, Get, HttpException, HttpStatus, Post, ServiceUnavailableException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from './prisma.service';
import { CurrentUser, JwtGuard, Roles, RolesGuard } from './auth';

const imageMimes = ['image/jpeg', 'image/png', 'image/webp'] as const;
type SupportedImageMime = (typeof imageMimes)[number];
type Certainty = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
type Taxonomy = { class?: string; order?: string; family?: string; genus?: string; species?: string };
type Annotation = { label?: string; score?: number; taxonomy?: Taxonomy; bbox?: number[] };
type AnimalDetectResponse = { annotations?: Annotation[]; info?: { model_id?: string; model_version?: string }; warning?: string };

export type SpeciesPrediction = {
  identifiable: boolean; commonName: string | null; scientificName: string | null;
  organismGroup: string | null; identifyingFeatures: string[]; habitat: string | null;
  certainty: Certainty; certaintyReason: string; limitations: string;
};

export function detectImageMime(bytes: Buffer): SupportedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export function animalDetectPrediction(payload: AnimalDetectResponse): SpeciesPrediction {
  if (!Array.isArray(payload.annotations)) throw new BadGatewayException('Animal Detect trả về kết quả không hợp lệ.');
  const annotation = [...payload.annotations].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  if (!annotation) return {
    identifiable: false, commonName: null, scientificName: null, organismGroup: null, identifyingFeatures: [], habitat: null,
    certainty: 'UNKNOWN', certaintyReason: 'Không phát hiện động vật vượt ngưỡng tin cậy.',
    limitations: 'Animal Detect phù hợp nhất với ảnh bẫy camera động vật hoang dã; hãy thử ảnh rõ hơn nếu có động vật trong ảnh.',
  };
  if (typeof annotation.label !== 'string' || typeof annotation.score !== 'number' || !annotation.taxonomy) throw new BadGatewayException('Animal Detect trả về kết quả không hợp lệ.');
  const score = Math.max(0, Math.min(1, annotation.score));
  const taxonomy = annotation.taxonomy;
  const certainty: Certainty = score >= 0.85 ? 'HIGH' : score >= 0.6 ? 'MEDIUM' : 'LOW';
  const hierarchy = [taxonomy.order, taxonomy.family, taxonomy.genus].filter(Boolean).join(' › ');
  return {
    identifiable: true,
    commonName: annotation.label.trim(),
    scientificName: taxonomy.species?.trim() || null,
    organismGroup: taxonomy.class?.trim() || null,
    identifyingFeatures: hierarchy ? [`Phân loại: ${hierarchy}`] : [],
    habitat: null,
    certainty,
    certaintyReason: `Điểm tin cậy từ Animal Detect: ${(score * 100).toFixed(1)}%.`,
    limitations: 'Kết quả máy học từ ảnh, không thay thế xác nhận của chuyên gia; dịch vụ chủ yếu được huấn luyện cho ảnh bẫy camera động vật hoang dã.',
  };
}

function mapAnimalDetectError(status: number): HttpException {
  if (status === 401 || status === 403) return new ServiceUnavailableException('Animal Detect chưa được xác thực. Hãy kiểm tra ANIMAL_DETECT_API_KEY.');
  if (status === 402 || status === 429) return new HttpException('Animal Detect đã hết quota hoặc đang giới hạn tần suất.', HttpStatus.TOO_MANY_REQUESTS);
  if (status === 413) return new BadRequestException('Ảnh vượt quá giới hạn của Animal Detect.');
  if (status >= 500) return new BadGatewayException('Animal Detect đang tạm thời không khả dụng.');
  return new BadGatewayException('Animal Detect không thể xử lý ảnh này.');
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
    storage: memoryStorage(),
    limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5242880), files: 1 },
    fileFilter: (_, file, callback) => imageMimes.includes(file.mimetype as SupportedImageMime) ? callback(null, true) : callback(new BadRequestException('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP'), false),
  }))
  async identify(@CurrentUser() user: { sub: string }, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu ảnh cần nhận diện');
    const bytes = file.buffer;
    const detectedMime = detectImageMime(bytes);
    if (!detectedMime || detectedMime !== file.mimetype) {
      throw new BadRequestException('Nội dung tệp không khớp định dạng ảnh JPEG, PNG hoặc WebP');
    }
    const pending = await this.db.speciesIdentification.create({ data: { userId: user.sub, storageKey: 'not-stored', status: 'PROCESSING', provider: 'Animal Detect' } });
    const apiKey = process.env.ANIMAL_DETECT_API_KEY?.trim();
    if (!apiKey) {
      const message = 'Animal Detect chưa được cấu hình. Quản trị viên cần thiết lập ANIMAL_DETECT_API_KEY.';
      await this.db.speciesIdentification.update({ where: { id: pending.id }, data: { status: 'FAILED', error: message } });
      throw new ServiceUnavailableException(message);
    }
    try {
      const form = new FormData();
      form.append('image', new Blob([new Uint8Array(bytes)], { type: detectedMime }), file.originalname);
      form.append('classify', 'true');
      form.append('threshold', process.env.ANIMAL_DETECT_THRESHOLD?.trim() || '0.2');
      form.append('top_candidate', '2');
      const country = process.env.ANIMAL_DETECT_COUNTRY?.trim();
      if (country) form.append('country', country);
      const response = await fetch('https://api.animaldetect.com/v1/detect', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'User-Agent': 'GreenBiology/1.0' }, body: form,
        signal: AbortSignal.timeout(Number(process.env.ANIMAL_DETECT_TIMEOUT_MS || 30000)),
      });
      const payload = await response.json().catch(() => ({})) as AnimalDetectResponse;
      if (!response.ok) throw mapAnimalDetectError(response.status);
      const prediction = animalDetectPrediction(payload);
      const bestScore = payload.annotations?.length ? Math.max(...payload.annotations.map((item) => item.score || 0)) : null;
      const species = prediction.scientificName ? await this.db.species.findFirst({ where: { scientificName: { equals: prediction.scientificName, mode: 'insensitive' } }, include: { source: true } }) : null;
      const updated = await this.db.speciesIdentification.update({ where: { id: pending.id }, data: { status: 'COMPLETED', predictionName: prediction.scientificName || prediction.commonName, confidence: bestScore, speciesId: species?.id, error: null } });
      return { identification: updated, prediction, warning: 'Kết quả Animal Detect chỉ là nhận diện sơ bộ, không phải kết luận khoa học.', species };
    } catch (error) {
      const mapped = error instanceof HttpException ? error : (error as { name?: string }).name === 'TimeoutError' ? new BadGatewayException('Animal Detect phản hồi quá thời gian cho phép.') : new BadGatewayException('Không thể kết nối Animal Detect.');
      await this.db.speciesIdentification.update({ where: { id: pending.id }, data: { status: 'FAILED', error: mapped.message } });
      throw mapped;
    }
  }
}
