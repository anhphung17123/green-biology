import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsString,
  Length,
} from "class-validator";
import { IncidentType, ReportStatus } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { CurrentUser, JwtGuard, Roles, RolesGuard } from "./auth";
class CreateReportDto {
  @IsString() @Length(5, 120) title!: string;
  @IsString() @Length(20, 3000) description!: string;
  @IsEnum(IncidentType) incidentType!: IncidentType;
  @IsLatitude() latitude!: number;
  @IsLongitude() longitude!: number;
  @IsBoolean() preciseLocationPublic = false;
}
class ModerateDto {
  @IsEnum(ReportStatus) action!: ReportStatus;
  @IsString() @Length(3, 500) reason!: string;
}
const imageOptions = {
  storage: diskStorage({
    destination: process.env.UPLOAD_DIR || "uploads",
    filename: (
      _: unknown,
      f: Express.Multer.File,
      cb: (e: Error | null, n: string) => void,
    ) => cb(null, `${randomUUID()}${extname(f.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5242880) },
  fileFilter: (
    _: unknown,
    f: Express.Multer.File,
    cb: (e: Error | null, ok: boolean) => void,
  ) =>
    ["image/jpeg", "image/png", "image/webp"].includes(f.mimetype)
      ? cb(null, true)
      : cb(new BadRequestException("Chỉ hỗ trợ JPEG, PNG hoặc WebP"), false),
};
@Controller("reports")
export class ReportsController {
  constructor(private db: PrismaService) {}
  @Get("public") publicReports() {
    return this.db.pollutionReport.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        title: true,
        description: true,
        incidentType: true,
        createdAt: true,
        preciseLocationPublic: true,
        latitude: true,
        longitude: true,
        media: { select: { id: true } },
      },
    });
  }
  @Get("mine") @UseGuards(JwtGuard) mine(@CurrentUser() u: { sub: string }) {
    return this.db.pollutionReport.findMany({
      where: { authorId: u.sub },
      include: { media: true, moderation: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
  }
  @Post() @UseGuards(JwtGuard, RolesGuard) @Roles("STUDENT") create(
    @CurrentUser() u: { sub: string },
    @Body() d: CreateReportDto,
  ) {
    return this.db.pollutionReport.create({ data: { ...d, authorId: u.sub } });
  }
  @Post(":id/media")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("STUDENT")
  @UseInterceptors(FilesInterceptor("images", 5, imageOptions))
  async media(
    @Param("id") id: string,
    @CurrentUser() u: { sub: string },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const report = await this.db.pollutionReport.findFirstOrThrow({
      where: {
        id,
        authorId: u.sub,
        status: { in: ["PENDING", "NEEDS_MORE_INFO"] },
      },
    });
    await this.db.reportMedia.createMany({
      data: files.map((f) => ({
        reportId: report.id,
        storageKey: f.filename,
        mimeType: f.mimetype,
        size: f.size,
      })),
    });
    return { uploaded: files.length };
  }
  @Post(":id/moderate")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("TEACHER")
  moderate(
    @Param("id") id: string,
    @CurrentUser() u: { sub: string },
    @Body() d: ModerateDto,
  ) {
    if (!["APPROVED", "REJECTED", "NEEDS_MORE_INFO"].includes(d.action))
      throw new BadRequestException("Trạng thái duyệt không hợp lệ");
    return this.db.$transaction(async (tx) => {
      const report = await tx.pollutionReport.update({
        where: { id },
        data: { status: d.action },
      });
      await tx.reportModeration.create({
        data: {
          reportId: id,
          teacherId: u.sub,
          action: d.action,
          reason: d.reason,
        },
      });
      return report;
    });
  }
}
