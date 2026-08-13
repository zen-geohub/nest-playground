import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { APP_FILTER } from "@nestjs/core";
import databaseConfig from "@/config/database.config";
import envConfig from "@/config/env.config";
import { LoggerModule } from "@/logger/logger.module";
import { DatabaseModule } from "@/database/database.module";
import { HealthModule } from "@/health/health.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { AllExceptionFilter } from "@/core/filters/all-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validationSchema: Joi.object({
        BASE_URL: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        ACCESS_SECRET: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
      }),
      load: [databaseConfig, envConfig],
    }),
    LoggerModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionFilter }],
})
export class AppModule {}
