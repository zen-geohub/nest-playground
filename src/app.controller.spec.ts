import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  describe("health", () => {
    it("should return health status with ok, uptime, and timestamp", () => {
      const result = appController.health();

      expect(result).toHaveProperty("status", "ok");
      expect(typeof result.uptime).toBe("number");
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.timestamp).toBe("string");
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });
});
