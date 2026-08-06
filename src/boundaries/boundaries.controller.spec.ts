/* eslint-disable @typescript-eslint/unbound-method */
import { BoundariesController } from "./boundaries.controller";
import { BoundariesService } from "./boundaries.service";
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

describe("BoundariesController", () => {
  let controller: BoundariesController;
  let service: jest.Mocked<BoundariesService>;

  beforeEach(async () => {
    const mockService = {
      getAdminFilters: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoundariesController],
      providers: [
        {
          provide: BoundariesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<BoundariesController>(BoundariesController);
    service = module.get(BoundariesService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getFilters", () => {
    it("should throw BadRequestException if id query param is missing", async () => {
      await expect(controller.getFilters("")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return filters for a valid id", async () => {
      const mockResult = [{ id: 31, name: "DKI Jakarta" }];
      service.getAdminFilters.mockResolvedValue(mockResult);

      const result = await controller.getFilters("31");
      expect(service.getAdminFilters).toHaveBeenCalledWith("31");
      expect(result).toEqual(mockResult);
    });
  });

  describe("getMVT", () => {
    it("should return formatted z x y coordinates string", () => {
      const result = controller.getMVT("10", "512", "512");
      expect(result).toBe("10 512 512");
    });
  });

  describe("postBoundary", () => {
    it("should handle boundary post request payload", () => {
      const payload = { id: "3171" };
      const result = controller.postBoundary(payload);
      expect(result).toEqual({
        message: "Hello world",
        id: "3171",
      });
    });
  });
});
