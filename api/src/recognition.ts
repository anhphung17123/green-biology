import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CurrentUser, JwtGuard, Roles, RolesGuard } from "./auth";
import { PrismaService } from "./prisma.service";
import { SpeciesApiService } from "./species-api.service";

const imageMimes = ["image/jpeg", "image/png", "image/webp"] as const;
type SupportedImageMime = (typeof imageMimes)[number];
export function detectImageMime(bytes: Buffer): SupportedImageMime | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return null;
}
@Controller("species-recognition")
@UseGuards(JwtGuard, RolesGuard)
@Roles("STUDENT")
export class RecognitionController {
  constructor(
    private readonly db: PrismaService,
    private readonly speciesApi: SpeciesApiService,
  ) {}
  @Get("mine") history(@CurrentUser() user: { sub: string }) {
    return this.db.speciesIdentification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }
  @Post()
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5242880),
        files: 1,
      },
      fileFilter: (_, file, callback) =>
        imageMimes.includes(file.mimetype as SupportedImageMime)
          ? callback(null, true)
          : callback(
              new BadRequestException("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP"),
              false,
            ),
    }),
  )
  async identify(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Thiếu ảnh cần nhận diện");
    const detectedMime = detectImageMime(file.buffer);
    if (!detectedMime || detectedMime !== file.mimetype)
      throw new BadRequestException(
        "Nội dung tệp không khớp định dạng ảnh JPEG, PNG hoặc WebP",
      );
    const pending = await this.db.speciesIdentification.create({
      data: {
        userId: user.sub,
        storageKey: "not-stored",
        status: "PROCESSING",
        provider: "Species API",
      },
    });
    try {
      const result = await this.speciesApi.identify(
        file.buffer,
        detectedMime,
        file.originalname,
      );
      const species = await this.db.species.findFirst({
        where: {
          scientificName: {
            equals: result.data.scientific_name,
            mode: "insensitive",
          },
        },
        include: { source: true },
      });
      const updated = await this.db.speciesIdentification.update({
        where: { id: pending.id },
        data: {
          status: "COMPLETED",
          predictionName:
            result.data.scientific_name || result.data.species_name,
          confidence: Math.max(0, Math.min(1, result.data.confidence)),
          speciesId: species?.id,
          error: null,
        },
      });
      return { ...result, identification: updated, species };
    } catch (error) {
      const mapped =
        error instanceof HttpException
          ? error
          : new HttpException("Không thể nhận kết quả từ Species API.", 502);
      await this.db.speciesIdentification.update({
        where: { id: pending.id },
        data: { status: "FAILED", error: mapped.message },
      });
      throw mapped;
    }
  }
}
