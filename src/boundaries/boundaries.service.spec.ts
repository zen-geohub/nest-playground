import { BoundariesRepository } from "@/boundaries/boundaries.repository";
import { Test, TestingModule } from "@nestjs/testing";
import { BoundariesService } from "./boundaries.service";

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

  describe("getAdminFilters", () => {
    it("should call repository.findFilters with id and return result", async () => {
      const mockRows = [
        { id: 31, name: "DKI Jakarta" },
        { id: 32, name: "Jawa Barat" },
      ];
      repository.findFilters.mockResolvedValue(mockRows);

      const result = await service.getAdminFilters("3");

      expect(repository.findFilters).toHaveBeenCalledWith("3");
      expect(result).toEqual(mockRows);
    });
  });
});
