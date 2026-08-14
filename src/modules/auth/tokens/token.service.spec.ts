/* eslint-disable @typescript-eslint/unbound-method */
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { TokenRepository } from "./token.repository";
import { TokenService } from "./token.service";

describe("TokenService", () => {
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;
  let repository: jest.Mocked<TokenRepository>;

  beforeEach(async () => {
    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockRepository = {
      insert: jest.fn(),
      findToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllSessions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: TokenRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService);
    repository = module.get(TokenRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateAccessToken", () => {
    it("should sign access token via JwtService", async () => {
      jwtService.signAsync.mockResolvedValue("mocked_access_token");

      const result = await service.generateAccessToken({ sub: "user-123" });

      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: "user-123" });
      expect(result).toBe("mocked_access_token");
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a 128-char hex refresh token, hash it, and store in repository", async () => {
      repository.insert.mockResolvedValue(undefined);

      const token = await service.generateRefreshToken("user-123");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(128); // 64 random bytes in hex = 128 chars

      const expectedHash = service.hashRefreshToken(token);
      expect(repository.insert).toHaveBeenCalledWith("user-123", expectedHash);
    });
  });

  describe("hashRefreshToken", () => {
    it("should consistently hash a raw token string using SHA-256", () => {
      const rawToken = "raw_sample_token_string";
      const hash1 = service.hashRefreshToken(rawToken);
      const hash2 = service.hashRefreshToken(rawToken);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("find", () => {
    it("should hash the raw refresh token and lookup token session in repository", async () => {
      const rawToken = "sample_refresh_token_abc";
      const hashedToken = service.hashRefreshToken(rawToken);

      const mockSession = {
        user_id: "user-123",
        expires_at: new Date(Date.now() + 10000).toISOString(),
        revoked_at: null,
      };

      repository.findToken.mockResolvedValue(mockSession);

      const result = await service.find(rawToken);

      expect(repository.findToken).toHaveBeenCalledWith(hashedToken);
      expect(result).toEqual(mockSession);
    });

    it("should return null if token session is not found", async () => {
      repository.findToken.mockResolvedValue(null);

      const result = await service.find("invalid_token");

      expect(result).toBeNull();
    });
  });
});
