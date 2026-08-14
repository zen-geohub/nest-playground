/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
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
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
      ],
    }).compile();

    repository = module.get<TokenRepository>(TokenRepository);
    dbService = module.get(DatabaseService);
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("insert", () => {
    it("should execute transaction to delete old user sessions and insert new session", async () => {
      dbService.transaction.mockImplementationOnce(async (cb: any) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
        };
        return cb(mockClient);
      });

      const expiryDate = new Date();
      await repository.insert("user-123", "hashed_token_abc", expiryDate);

      expect(dbService.transaction).toHaveBeenCalled();
    });
  });

  describe("findToken", () => {
    it("should return token session record if active token is found", async () => {
      const mockRow = {
        user_id: "user-123",
        expires_at: "2026-08-20T00:00:00Z",
        revoked_at: null,
      };

      dbService.query.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findToken("hashed_token_abc");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /SELECT\s+user_id,\s*expires_at,\s*revoked_at\s+FROM\s+user_sessions/i,
        ),
        ["hashed_token_abc"],
      );
      expect(result).toEqual(mockRow);
    });

    it("should return null if token is not found in database", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findToken("nonexistent_hash");

      expect(result).toBeNull();
    });
  });

  describe("revokeToken", () => {
    it("should set revoked_at timestamp for specified token", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      await repository.revokeToken("hashed_token_abc");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /UPDATE\s+user_sessions\s+SET\s+revoked_at\s*=\s*NOW\(\)/i,
        ),
        ["hashed_token_abc"],
      );
    });
  });

  describe("revokeAllSessions", () => {
    it("should set revoked_at timestamp for all active sessions of a user", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 2,
        command: "UPDATE",
        oid: 0,
        fields: [],
      });

      await repository.revokeAllSessions("user-123");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /UPDATE\s+user_sessions\s+SET\s+revoked_at\s*=\s*NOW\(\)/i,
        ),
        ["user-123"],
      );
    });
  });
});
