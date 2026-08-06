import { BoundariesModule } from "@/boundaries/boundaries.module";
import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "@nestjs/config";
import databaseConfig from "@/config/database.config";
import Joi from "joi";
import { AppController } from "@/app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validationSchema: Joi.object({
        DB_URI: Joi.string().required(),
      }),
      load: [databaseConfig],
    }),
    DatabaseModule,
    BoundariesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
