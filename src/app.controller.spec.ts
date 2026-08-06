import { AppController } from "./app.controller";
import { Test, TestingModule } from "@nestjs/testing";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("health", () => {
    it("should return health status ok", () => {
      const response = appController.health();
      expect(response).toHaveProperty("status", "ok");
      expect(response).toHaveProperty("uptime");
      expect(response).toHaveProperty("timestamp");
    });
  });
});
