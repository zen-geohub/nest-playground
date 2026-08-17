import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Health")
@Controller()
export class HealthController {
  @Get("/health")
  @ApiOperation({ summary: "Check system health status and uptime" })
  @ApiResponse({
    status: 200,
    description: "System health metrics retrieved successfully.",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        uptime: { type: "string", example: "00:15:30" },
        timestamp: { type: "string", example: "2026-08-16T22:54:00.000Z" },
      },
    },
  })
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
