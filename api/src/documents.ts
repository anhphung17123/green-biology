import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { extname, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { PrismaService } from "./prisma.service";
import { JwtGuard, Roles, RolesGuard } from "./auth";
import { StorageService } from "./storage";
const docMimes = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
@Injectable()
export class DocumentWorker {
  constructor(
    private db: PrismaService,
    private storage: StorageService,
  ) {}
  enqueue(id: string) {
    setImmediate(() => void this.process(id));
  }
  async process(id: string) {
    const doc = await this.db.educationalDocument.update({
      where: { id },
      data: { status: "PROCESSING", error: null },
    });
    try {
      const buffer = await readFile(this.storage.path(doc.storageKey));
      let text = "";
      if (doc.mimeType === "application/pdf") text = (await pdf(buffer)).text;
      else if (doc.mimeType.includes("wordprocessingml"))
        text = (await mammoth.extractRawText({ buffer })).value;
      else text = buffer.toString("utf8");
      text = text.replace(/\s+/g, " ").trim();
      if (text.length < 50)
        throw new Error("Tài liệu không có đủ văn bản để lập chỉ mục");
      const chunks = chunk(text, 1200, 180);
      await this.db.$transaction(async (tx) => {
        await tx.documentChunk.deleteMany({ where: { documentId: id } });
        await tx.documentChunk.createMany({
          data: chunks.map((content, i) => ({
            documentId: id,
            content,
            position: i,
          })),
        });
        await tx.educationalDocument.update({
          where: { id },
          data: { status: "READY" },
        });
      });
    } catch (e) {
      await this.db.educationalDocument.update({
        where: { id },
        data: {
          status: "FAILED",
          error: e instanceof Error ? e.message : "Xử lý thất bại",
        },
      });
    }
  }
}
export function chunk(text: string, size: number, overlap: number) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size - overlap)
    out.push(text.slice(i, i + size));
  return out;
}
@Controller("documents")
@UseGuards(JwtGuard, RolesGuard)
@Roles("TEACHER")
export class DocumentsController {
  constructor(
    private db: PrismaService,
    private worker: DocumentWorker,
    private storage: StorageService,
  ) {}
  @Get() list() {
    return this.db.educationalDocument.findMany({
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_, __, cb) =>
          cb(null, resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads")),
        filename: (_, f, cb) =>
          cb(null, `${randomUUID()}${extname(f.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5242880) },
      fileFilter: (_, f, cb) =>
        docMimes.includes(f.mimetype)
          ? cb(null, true)
          : cb(
              new BadRequestException(
                "Chỉ hỗ trợ PDF, DOCX, TXT hoặc Markdown",
              ),
              false,
            ),
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("Thiếu tệp tài liệu");
    const row = await this.db.educationalDocument.create({
      data: {
        title: file.originalname.slice(0, 200),
        storageKey: file.filename,
        mimeType: file.mimetype,
      },
    });
    this.worker.enqueue(row.id);
    return row;
  }
  @Delete(":id") async remove(@Param("id") id: string) {
    const doc = await this.db.educationalDocument.delete({ where: { id } });
    this.storage.remove(doc.storageKey);
    return { deleted: true };
  }
}
