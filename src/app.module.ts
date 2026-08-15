import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import databaseConfig from "@/config/database.config";
import envConfig from "@/config/env.config";
import { LoggerModule } from "@/logger/logger.module";
import { DatabaseModule } from "@/database/database.module";
import { HealthModule } from "@/health/health.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { AllExceptionFilter } from "@/core/filters/all-exception.filter";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottleGuard } from "@/core/guards/throttle.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validationSchema: Joi.object({
        APP_URL: Joi.string().required(),
        BASE_URL: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        ACCESS_SECRET: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_REFRESH_TOKEN: Joi.string().required(),
        SMTP_USER: Joi.string().required(),
      }),
      load: [databaseConfig, envConfig],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60_000, // 60s
          limit: 20, // Max req per window
        },
      ],
    }),
    LoggerModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottleGuard },
    { provide: APP_FILTER, useClass: AllExceptionFilter },
  ],
})
export class AppModule {}
