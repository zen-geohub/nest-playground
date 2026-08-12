/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule as PinoModule } from "nestjs-pino";

@Module({
  imports: [
    PinoModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env = config.get("NODE_ENV") !== "production";

        return {
          pinoHttp: {
            level: env ? "debug" : "info",
            transport: env
              ? {
                  target: "pino-pretty",
                  options: { colorize: true, singleLine: true },
                }
              : undefined,
            redact: ["req.headers.authorization", "req.headers.cookie"],
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url,
                requestId: req.id,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },
            autoLogging: {
              ignore: (req) => req.url === "/health",
            },
          },
        };
      },
    }),
  ],
  exports: [PinoModule],
})
export class LoggerModule {}
