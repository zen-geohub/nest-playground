/* eslint-disable @typescript-eslint/unbound-method */
import { hash } from "../../utils/argon";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PinoLogger } from "nestjs-pino";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { CreateUserDto, LoginDto } from "./dto";
import { SessionService } from "./sessions/session.service";
import { TokenService } from "./tokens/token.service";

describe("AuthService", () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;
  let sessionService: jest.Mocked<SessionService>;
  let tokenService: jest.Mocked<TokenService>;

  beforeEach(async () => {
    const mockRepository = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      insertUser: jest.fn(),
      findOrCreateIdentity: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
    };

    const mockSessionService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      find: jest.fn(),
      logout: jest.fn(),
    };

    const mockTokenService = {
      generateVerificationToken: jest.fn(),
      resendVerificationToken: jest.fn(),
      verifyToken: jest.fn(),
    };

    const mockConfigService = {
      getOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockRepository },
        { provide: PinoLogger, useValue: mockLogger },
        { provide: SessionService, useValue: mockSessionService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get(AuthRepository);
    sessionService = module.get(SessionService);
    tokenService = module.get(TokenService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should hash password, insert user, generate verification token, and return token", async () => {
      const payload: CreateUserDto = {
        name: "Test User",
        email: "test@example.com",
        password: "PlainPassword123!",
      };

      repository.insertUser.mockResolvedValue("user-uuid-101");
      tokenService.generateVerificationToken.mockResolvedValue(
        "verif_token_abc",
      );

      const result = await service.create(payload);

      expect(repository.insertUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test User",
          email: "test@example.com",
        }),
      );
      expect(tokenService.generateVerificationToken).toHaveBeenCalledWith(
        "user-uuid-101",
      );
      expect(result).toEqual({ token: "verif_token_abc" });
    });

    it("should propagate ConflictException when email is already registered", async () => {
      const payload: CreateUserDto = {
        name: "Duplicate User",
        email: "duplicate@example.com",
        password: "Password123!",
      };

      repository.insertUser.mockRejectedValue(
        new ConflictException("Email already exists!"),
      );

      await expect(service.create(payload)).rejects.toThrow(ConflictException);
    });
  });

  describe("resendVerifEmail", () => {
    it("should throw BadRequestException if email is not found", async () => {
      repository.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.resendVerifEmail("nonexistent@example.com"),
      ).rejects.toThrow(new BadRequestException("Email not found!"));
    });

    it("should throw BadRequestException if email is already verified", async () => {
      repository.findUserByEmail.mockResolvedValue({
        id: "user-123",
        email: "verified@example.com",
        password: "hash",
        name: "Verified User",
        email_verified_at: "2026-08-15T00:00:00Z",
      });

      await expect(
        service.resendVerifEmail("verified@example.com"),
      ).rejects.toThrow(new BadRequestException("Email already verified!"));
    });

    it("should generate resend verification token for unverified user", async () => {
      repository.findUserByEmail.mockResolvedValue({
        id: "user-123",
        email: "unverified@example.com",
        password: "hash",
        name: "Unverified User",
        email_verified_at: null as unknown as string,
      });

      tokenService.resendVerificationToken.mockResolvedValue(
        "new_verif_token_xyz",
      );

      const result = await service.resendVerifEmail("unverified@example.com");

      expect(tokenService.resendVerificationToken).toHaveBeenCalledWith(
        "user-123",
      );
      expect(result).toEqual({ token: "new_verif_token_xyz" });
    });
  });

  describe("login", () => {
    it("should authenticate valid user and return access_token and refresh_token", async () => {
      const plainPassword = "MySecretPassword123!";
      const hashedPassword = await hash(plainPassword);

      const loginPayload: LoginDto = {
        email: "user@example.com",
        password: plainPassword,
      };

      const mockUserRecord = {
        id: "user-uuid-101",
        email: "user@example.com",
        password: hashedPassword,
        name: "Jane Doe",
        email_verified_at: "2026-08-15T00:00:00Z",
      };

      repository.findUserByEmail.mockResolvedValue(mockUserRecord);
      sessionService.generateAccessToken.mockResolvedValue("access_token_123");
      sessionService.generateRefreshToken.mockResolvedValue(
        "refresh_token_abc",
      );

      const result = await service.login(loginPayload);

      expect(repository.findUserByEmail).toHaveBeenCalledWith(
        "user@example.com",
      );
      expect(sessionService.generateAccessToken).toHaveBeenCalledWith(
        "user-uuid-101",
      );
      expect(sessionService.generateRefreshToken).toHaveBeenCalledWith(
        "user-uuid-101",
      );
      expect(result).toEqual({
        access_token: "access_token_123",
        refresh_token: "refresh_token_abc",
      });
    });

    it("should throw NotFoundException if user email does not exist", async () => {
      const loginPayload: LoginDto = {
        email: "nonexistent@example.com",
        password: "Password123!",
      };

      repository.findUserByEmail.mockResolvedValue(null);

      await expect(service.login(loginPayload)).rejects.toThrow(
        new NotFoundException("User not found!"),
      );
    });

    it("should throw UnauthorizedException if password does not match", async () => {
      const correctPassword = "CorrectPassword123!";
      const hashedPassword = await hash(correctPassword);

      const loginPayload: LoginDto = {
        email: "user@example.com",
        password: "WrongPassword123!",
      };

      const mockUserRecord = {
        id: "user-uuid-101",
        email: "user@example.com",
        password: hashedPassword,
        name: "Jane Doe",
        email_verified_at: "2026-08-15T00:00:00Z",
      };

      repository.findUserByEmail.mockResolvedValue(mockUserRecord);

      await expect(service.login(loginPayload)).rejects.toThrow(
        new UnauthorizedException("Invalid credentials!"),
      );
    });
  });

  describe("me", () => {
    it("should return user profile data for authenticated user ID", async () => {
      const mockUserRecord = {
        id: "user-uuid-101",
        email: "user@example.com",
        password: "hashed_password",
        name: "Jane Doe",
      };

      repository.findUserById.mockResolvedValue(mockUserRecord);

      const result = await service.me("user-uuid-101");

      expect(repository.findUserById).toHaveBeenCalledWith("user-uuid-101");
      expect(result).toEqual({
        id: "user-uuid-101",
        email: "user@example.com",
        name: "Jane Doe",
      });
    });

    it("should throw NotFoundException if user ID is not found", async () => {
      repository.findUserById.mockResolvedValue(null);

      await expect(service.me("invalid-id")).rejects.toThrow(
        new NotFoundException("User not found!"),
      );
    });
  });

  describe("findOrCreateIdentity", () => {
    it("should find or create identity and issue access and refresh tokens for OAuth user", async () => {
      const oauthPayload = {
        provider: "google",
        id: "google-id-888",
        email: "oauthuser@example.com",
        name: "OAuth User",
      };

      repository.findOrCreateIdentity.mockResolvedValue({
        userId: "user-uuid-oauth-999",
        isNewUser: true,
      });
      sessionService.generateAccessToken.mockResolvedValue("access_oauth_123");
      sessionService.generateRefreshToken.mockResolvedValue(
        "refresh_oauth_abc",
      );

      const result = await service.findOrCreateIdentity(oauthPayload);

      expect(repository.findOrCreateIdentity).toHaveBeenCalledWith(
        oauthPayload,
      );
      expect(sessionService.generateAccessToken).toHaveBeenCalledWith(
        "user-uuid-oauth-999",
      );
      expect(sessionService.generateRefreshToken).toHaveBeenCalledWith(
        "user-uuid-oauth-999",
      );
      expect(result).toEqual({
        access_token: "access_oauth_123",
        refresh_token: "refresh_oauth_abc",
      });
    });
  });
});
