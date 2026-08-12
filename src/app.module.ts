import { BoundariesModule } from "@/boundaries/boundaries.module";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "@nestjs/config";
import databaseConfig from "@/config/database.config";
import Joi from "joi";
import { AppController } from "@/app.controller";
import { LoggerModule } from "@/logger/logger.module";

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
    BoundariesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
