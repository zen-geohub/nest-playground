/* eslint-disable @typescript-eslint/unbound-method */
import { BoundariesRepository } from "./boundaries.repository";
import { DatabaseService } from "../database/database.service";
import { Test, TestingModule } from "@nestjs/testing";

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

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("findFilters", () => {
    it("should query the correct table for province level (length 0)", async () => {
      const mockRows = [{ id: 31, name: "DKI Jakarta" }];
      dbService.query.mockResolvedValue({
        rows: mockRows,
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findFilters("");
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM mv_admin_province"),
        ["%"],
      );
      expect(result).toEqual(mockRows);
    });

    it("should query the correct table for district level (length 4)", async () => {
      const mockRows = [{ id: 3171, name: "Jakarta Selatan" }];
      dbService.query.mockResolvedValue({
        rows: mockRows,
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findFilters("3171");
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM mv_admin_district"),
        ["3171%"],
      );
      expect(result).toEqual(mockRows);
    });

    it("should throw an error for unsupported ID length", async () => {
      await expect(repository.findFilters("123")).rejects.toThrow(
        "Invalid parameters!",
      );
    });
  });
});
