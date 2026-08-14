/* eslint-disable @typescript-eslint/unbound-method */
import { hash } from "../../utils/argon";
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PinoLogger } from "nestjs-pino";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { CreateUserDto, LoginDto } from "./dto";
import { TokenService } from "./tokens/token.service";

describe("AuthService", () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;
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

    const mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: mockRepository,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get(AuthRepository);
    tokenService = module.get(TokenService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should hash plain text password securely and insert user into repository", async () => {
      const payload: CreateUserDto = {
        name: "Test User",
        email: "test@example.com",
        password: "PlainPassword123!",
      };

      const mockResult = {
        success: true,
        message: "Successfully register new account.",
      };

      repository.insertUser.mockResolvedValue(mockResult);

      const result = await service.create(payload);

      expect(repository.insertUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test User",
          email: "test@example.com",
        }),
      );

      expect(payload.password).not.toBe("PlainPassword123!");
      expect(payload.password).toContain("$argon2id$");
      expect(result).toEqual(mockResult);
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
      };

      repository.findUserByEmail.mockResolvedValue(mockUserRecord);
      tokenService.generateAccessToken.mockResolvedValue("access_token_123");
      tokenService.generateRefreshToken.mockResolvedValue("refresh_token_abc");

      const result = await service.login(loginPayload);

      expect(repository.findUserByEmail).toHaveBeenCalledWith(
        "user@example.com",
      );
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        sub: "user-uuid-101",
      });
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(
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
      expect(result).not.toHaveProperty("password");
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
      tokenService.generateAccessToken.mockResolvedValue("access_oauth_123");
      tokenService.generateRefreshToken.mockResolvedValue("refresh_oauth_abc");

      const result = await service.findOrCreateIdentity(oauthPayload);

      expect(repository.findOrCreateIdentity).toHaveBeenCalledWith(
        oauthPayload,
      );
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        sub: "user-uuid-oauth-999",
      });
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(
        "user-uuid-oauth-999",
      );
      expect(result).toEqual({
        access_token: "access_oauth_123",
        refresh_token: "refresh_oauth_abc",
      });
    });
  });

  describe("find", () => {
    it("should delegate refresh token lookup to tokenService.find", async () => {
      const mockSession = {
        user_id: "user-123",
        expires_at: "2026-08-20T00:00:00Z",
        revoked_at: null,
      };

      tokenService.find.mockResolvedValue(mockSession);

      const result = await service.find("token_abc");

      expect(tokenService.find).toHaveBeenCalledWith("token_abc");
      expect(result).toEqual(mockSession);
    });
  });
});
