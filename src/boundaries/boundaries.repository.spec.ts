import { DatabaseService } from "@/database/database.service";
import { Test, TestingModule } from "@nestjs/testing";
import { BoundariesRepository } from "./boundaries.repository";

describe("BoundariesRepository", () => {
  let repository: BoundariesRepository;
  let dbService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    const mockDbService = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoundariesRepository,
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
      ],
    }).compile();

    repository = module.get<BoundariesRepository>(BoundariesRepository);
    dbService = module.get(DatabaseService);
  });

  describe("findFilters", () => {
    it("should query mv_admin_province when id length is 0", async () => {
      const mockRows = [{ id: 31, name: "DKI Jakarta" }];
      dbService.query.mockResolvedValue({ rows: mockRows } as any);

      const result = await repository.findFilters("");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM mv_admin_province"),
        ["%"],
      );
      expect(result).toEqual(mockRows);
    });

    it("should query mv_admin_city when id length is 1 or 2", async () => {
      dbService.query.mockResolvedValue({ rows: [] } as any);

      await repository.findFilters("3");
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM mv_admin_city"),
        ["3%"],
      );

      await repository.findFilters("31");
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM mv_admin_city"),
        ["31%"],
      );
    });

    it("should query mv_admin_district when id length is 4", async () => {
      dbService.query.mockResolvedValue({ rows: [] } as any);

      await repository.findFilters("3171");
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM mv_admin_district"),
        ["3171%"],
      );
    });

    it("should throw error if id length does not match any admin level", async () => {
      // Length 3 is invalid according to ADMIN_LEVELS map
      await expect(repository.findFilters("123")).rejects.toThrow(
        "Invalid parameters!",
      );
      expect(dbService.query).not.toHaveBeenCalled();
    });
  });
});
