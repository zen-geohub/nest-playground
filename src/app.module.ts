import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "@nestjs/config";
import databaseConfig from "./config/database.config";
import Joi from "joi";
import { LoggerModule } from "./logger/logger.module";
import { HealthModule } from "./health/health.module";
import { APP_FILTER } from "@nestjs/core";
import { AllExceptionFilter } from "./core/filters/all-exception.filter";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
      }),
      load: [databaseConfig],
    }),
    LoggerModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionFilter }],
})
export class AppModule {}
