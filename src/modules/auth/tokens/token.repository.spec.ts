/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import { DatabaseService } from "../../../database/database.service";
import { BadRequestException } from "@nestjs/common";
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
    it("should execute transaction updating used_at and email_verified_at when valid token is found", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [{ user_id: "user-123" }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      dbService.transaction.mockImplementationOnce(async (cb: any) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
        };
        return cb(mockClient);
      });

      await repository.verify("hashed_valid_token");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /SELECT\s+\*\s+FROM\s+user_tokens\s+WHERE\s+token\s*=\s*\$1/i,
        ),
        ["hashed_valid_token", "email_verification"],
      );
      expect(dbService.transaction).toHaveBeenCalled();
    });

    it("should throw BadRequestException if token is missing, expired, or already used", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await expect(
        repository.verify("invalid_or_expired_token"),
      ).rejects.toThrow(new BadRequestException("Invalid or expired token."));
    });
  });
});
