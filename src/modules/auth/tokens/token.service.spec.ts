/* eslint-disable @typescript-eslint/unbound-method */
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { TokenRepository } from "./token.repository";
import { TokenService } from "./token.service";

describe("TokenService", () => {
  let service: TokenService;
  let repository: jest.Mocked<TokenRepository>;

  beforeEach(async () => {
    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockRepository = {
      insert: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      findByToken: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: TokenRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    repository = module.get(TokenRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateOpaqueToken", () => {
    it("should generate a random 128-char hex string", () => {
      const token = service.generateOpaqueToken();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(128);
    });
  });

  describe("hashToken", () => {
    it("should return a 64-char SHA-256 hex string", () => {
      const rawToken = "raw_sample_token";
      const hash1 = service.hashToken(rawToken);
      const hash2 = service.hashToken(rawToken);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("generateVerificationToken", () => {
    it("should generate token, hash it, and store in repository with email_verification type", async () => {
      repository.insert.mockResolvedValue(undefined);

      const token = await service.generateVerificationToken(
        "user-123",
        "email_verification",
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const expectedHash = service.hashToken(token);
      expect(repository.insert).toHaveBeenCalledWith(
        "user-123",
        "email_verification",
        expectedHash,
        expect.any(Date),
      );
    });
  });

  describe("resendVerificationToken", () => {
    it("should upsert token for user and generate a new verification token", async () => {
      repository.upsert.mockResolvedValue(undefined);

      const token = await service.resendVerificationToken(
        "user-123",
        "email_verification",
      );

      expect(repository.upsert).toHaveBeenCalledWith(
        "user-123",
        "email_verification",
        expect.any(String),
        expect.any(Date),
      );
      expect(token).toBeDefined();
    });
  });
});
