import { BoundariesService } from "@/boundaries/boundaries.service";
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { BoundariesController } from "./boundaries.controller";

describe("BoundariesController", () => {
  let controller: BoundariesController;
  let service: jest.Mocked<BoundariesService>;

  beforeEach(async () => {
    const mockBoundariesService = {
      getAdminFilters: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoundariesController],
      providers: [
        {
          provide: BoundariesService,
          useValue: mockBoundariesService,
        },
      ],
    }).compile();

    controller = module.get<BoundariesController>(BoundariesController);
    service = module.get(BoundariesService);
  });

  describe("getFilters", () => {
    it("should throw BadRequestException if id query param is missing", async () => {
      await expect(controller.getFilters("")).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getFilters("")).rejects.toThrow(
        "ID is required!",
      );
    });

    it("should return admin filters when valid id is provided", async () => {
      const mockResult = [{ id: 31, name: "DKI Jakarta" }];
      service.getAdminFilters.mockResolvedValue(mockResult);

      const result = await controller.getFilters("31");

      expect(service.getAdminFilters).toHaveBeenCalledWith("31");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getMVT", () => {
    it("should return formatted z x y path string", () => {
      const result = controller.getMVT("14", "13144", "8242");
      expect(result).toBe("14 13144 8242");
    });
  });

  describe("postBoundary", () => {
    it("should return echo payload with message", () => {
      const payload = { id: "3171" };
      const result = controller.postBoundary(payload);
      expect(result).toEqual({
        message: "Hello world",
        id: "3171",
      });
    });
  });
});
