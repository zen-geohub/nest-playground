/* eslint-disable @typescript-eslint/unbound-method */
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { TokenService } from "../tokens/token.service";
import { SessionRepository } from "./session.repository";
import { SessionService } from "./session.service";

describe("SessionService", () => {
  let service: SessionService;
  let repository: jest.Mocked<SessionRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let tokenService: jest.Mocked<TokenService>;

  beforeEach(async () => {
    const mockRepository = {
      insert: jest.fn(),
      findToken: jest.fn(),
      revokeTokenSession: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockTokenService = {
      generateOpaqueToken: jest
        .fn()
        .mockReturnValue("raw_opaque_refresh_token_123"),
      hashToken: jest.fn().mockImplementation((t: string) => `hashed_${t}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: SessionRepository, useValue: mockRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    repository = module.get(SessionRepository);
    jwtService = module.get(JwtService);
    tokenService = module.get(TokenService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateAccessToken", () => {
    it("should sign access token via JwtService", async () => {
      jwtService.signAsync.mockResolvedValue("jwt_access_token_abc");

      const result = await service.generateAccessToken("user-123");

      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: "user-123" });
      expect(result).toBe("jwt_access_token_abc");
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate opaque token, hash it, and store in session repository", async () => {
      repository.insert.mockResolvedValue(undefined);

      const token = await service.generateRefreshToken("user-123");

      expect(tokenService.generateOpaqueToken).toHaveBeenCalled();
      expect(tokenService.hashToken).toHaveBeenCalledWith(
        "raw_opaque_refresh_token_123",
      );
      expect(repository.insert).toHaveBeenCalledWith(
        "user-123",
        "hashed_raw_opaque_refresh_token_123",
      );
      expect(token).toBe("raw_opaque_refresh_token_123");
    });
  });

  describe("find", () => {
    it("should hash token and call repository.findToken", async () => {
      const mockSession = {
        user_id: "user-123",
        expires_at: "2026-08-22T00:00:00Z",
        revoked_at: null,
      };

      repository.findToken.mockResolvedValue(mockSession);

      const result = await service.find("raw_token_xyz");

      expect(tokenService.hashToken).toHaveBeenCalledWith("raw_token_xyz");
      expect(repository.findToken).toHaveBeenCalledWith("hashed_raw_token_xyz");
      expect(result).toEqual(mockSession);
    });

    it("should return null if token is not found or revoked", async () => {
      repository.findToken.mockResolvedValue(null);

      const result = await service.find("invalid_token");

      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("should hash token and call repository.revokeTokenSession", async () => {
      repository.revokeTokenSession.mockResolvedValue(undefined);

      await service.logout("raw_token_logout");

      expect(tokenService.hashToken).toHaveBeenCalledWith("raw_token_logout");
      expect(repository.revokeTokenSession).toHaveBeenCalledWith(
        "hashed_raw_token_logout",
      );
    });
  });
});
