import databaseConfig from "@/config/database.config";
import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseService } from "./database.service";

// Mock pg module
jest.mock("pg", () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mPool = {
    connect: jest.fn().mockResolvedValue(mClient),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe("DatabaseService", () => {
  let service: DatabaseService;

  beforeEach(async () => {
    const mockDbConfig = {
      uri: "postgresql://user:pass@localhost:5432/testdb",
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: databaseConfig.KEY,
          useValue: mockDbConfig,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("query", () => {
    it("should delegate query execution to the connection pool", async () => {
      const mockResult = { rows: [{ id: 1, name: "Test" }], rowCount: 1 };
      (service["pool"].query as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.query("SELECT * FROM test WHERE id = $1", [
        1,
      ]);

      expect(service["pool"].query).toHaveBeenCalledWith(
        "SELECT * FROM test WHERE id = $1",
        [1],
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("transaction", () => {
    it("should execute BEGIN, callback, COMMIT and release client on success", async () => {
      const mockClient = await service["pool"].connect();
      (mockClient.query as jest.Mock).mockResolvedValue({});

      const callback = jest.fn().mockResolvedValue("transaction_result");

      const result = await service.transaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe("transaction_result");
    });

    it("should execute ROLLBACK and rethrow error when transaction fails", async () => {
      const mockClient = await service["pool"].connect();
      (mockClient.query as jest.Mock).mockResolvedValue({});

      const testError = new Error("DB Error");
      const callback = jest.fn().mockRejectedValue(testError);

      await expect(service.transaction(callback)).rejects.toThrow("DB Error");

      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
