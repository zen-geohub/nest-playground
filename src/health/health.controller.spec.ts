import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe("health", () => {
    it("should return health status ok", () => {
      const response = healthController.health();
      expect(response).toHaveProperty("status", "ok");
      expect(response).toHaveProperty("uptime");
      expect(response).toHaveProperty("timestamp");
    });
  });
});
