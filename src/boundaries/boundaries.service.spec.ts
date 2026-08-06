/* eslint-disable @typescript-eslint/unbound-method */
import { BoundariesRepository } from "./boundaries.repository";
import { BoundariesService } from "./boundaries.service";
import { Test, TestingModule } from "@nestjs/testing";

describe("BoundariesService", () => {
  let service: BoundariesService;
  let repository: jest.Mocked<BoundariesRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findFilters: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoundariesService,
        {
          provide: BoundariesRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BoundariesService>(BoundariesService);
    repository = module.get(BoundariesRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getAdminFilters", () => {
    it("should call repository.findFilters with id and return results", async () => {
      const mockFilters = [{ id: 31, name: "DKI Jakarta" }];
      repository.findFilters.mockResolvedValue(mockFilters);

      const result = await service.getAdminFilters("31");
      expect(repository.findFilters).toHaveBeenCalledWith("31");
      expect(result).toEqual(mockFilters);
    });
  });
});
