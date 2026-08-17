/* eslint-disable @typescript-eslint/unbound-method */
import { DatabaseService } from "../../../database/database.service";
import { Test, TestingModule } from "@nestjs/testing";
import { TokenRepository } from "./token.repository";

describe("TokenRepository", () => {
  let repository: TokenRepository;
  let dbService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    const mockDbService = {
      query: jest.fn(),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenRepository,
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();

    repository = module.get<TokenRepository>(TokenRepository);
    dbService = module.get(DatabaseService);
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("insert", () => {
    it("should insert user token record into user_tokens table", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: "INSERT",
        oid: 0,
        fields: [],
      });

      const expiryDate = new Date();
      await repository.insert(
        "user-123",
        "email_verification",
        "hashed_token",
        expiryDate,
      );

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO user_tokens/i),
        expect.any(Array),
      );
    });
  });

  describe("delete", () => {
    it("should delete all tokens associated with user_id", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: "DELETE",
        oid: 0,
        fields: [],
      });

      await repository.delete("user-123");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /DELETE\s+FROM\s+user_tokens\s+WHERE\s+user_id\s*=\s*\$1/i,
        ),
        ["user-123"],
      );
    });
  });

  describe("verify", () => {
    it("should update used_at for valid token", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      await repository.verify("hashed_valid_token");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /UPDATE\s+user_tokens\s+SET\s+used_at\s*=\s*NOW\(\)/i,
        ),
        ["hashed_valid_token"],
      );
    });
  });
});
