import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("/health")
  health() {
    const raw = process.uptime();

    const uptime = `${Math.floor(raw / 3600)
      .toString()
      .padStart(2, "0")}:${Math.floor((raw % 3600) / 60)
      .toString()
      .padStart(2, "0")}:${Math.floor(raw % 60)
      .toString()
      .padStart(2, "0")}`;

    return {
      status: "ok",
      uptime,
      timestamp: new Date().toISOString(),
    };
  }
}
