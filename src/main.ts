import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";
import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";

async function bootstrap() {
  const env = process.env.NODE_ENV === "production";
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.enableCors({
    origin: ["https://apps.zen.is-a.dev", "http://localhost:5173"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Accept, Authorization",
    credentials: true,
  });
  app.set("trust proxy", 1);
  app.useLogger(app.get(Logger));
  app.use(cookieParser());

  const configBuilder = new DocumentBuilder()
    .setTitle("Zen Auth API")
    .setDescription(
      "API Documentation for Auth Playground that utilize authentication, OAuth2, and session management. Currently limited to one session for all.",
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT Access Token",
      },
      "JWT-auth",
    )
    .addCookieAuth("refresh_token");

  if (env) configBuilder.addServer("/api", "Prod Proxy Server");
  else configBuilder.addServer("/", "Local");

  const config = configBuilder.build();
  const document = SwaggerModule.createDocument(app, config);

  app.use(
    "/docs",
    apiReference({
      spec: {
        content: document,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
