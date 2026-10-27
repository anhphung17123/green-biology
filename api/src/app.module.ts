import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./prisma.service";
import { AuthController, RolesGuard } from "./auth";
import { ProtectedAreasController } from "./protected-areas";
import { ChallengesController } from "./challenges";
import { ChatController } from "./chat";
import { ReportsController } from "./reports";
import { AirQualityController } from "./air-quality";
import { GamesController } from "./games";
import { UsersController } from "./users";
import { DocumentsController, DocumentWorker } from "./documents";
import { RecognitionController } from "./recognition";
import { AdminController } from "./admin";
import { StorageService } from "./storage";
import { RiverAiController } from "./river-ai";
import { RiverAiService } from "./river-ai.service";
import { SpeciesApiService } from "./species-api.service";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "development-only-change-this-secret",
      signOptions: { expiresIn: "8h" },
    }),
  ],
  controllers: [
    AuthController,
    ProtectedAreasController,
    ChallengesController,
    ChatController,
    ReportsController,
    AirQualityController,
    GamesController,
    UsersController,
    DocumentsController,
    RecognitionController,
    AdminController,
    RiverAiController,
  ],
  providers: [
    PrismaService,
    StorageService,
    DocumentWorker,
    RolesGuard,
    RiverAiService,
    SpeciesApiService,
  ],
})
export class AppModule {}
