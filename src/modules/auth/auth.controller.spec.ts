/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CreateUserDto, LoginDto } from "./dto";
import { TokenService } from "./tokens/token.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let tokenService: jest.Mocked<TokenService>;

  const mockResponse = () => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const mockAuthService = {
      create: jest.fn(),
      login: jest.fn(),
      me: jest.fn(),
      findOrCreateIdentity: jest.fn(),
    };

    const mockTokenService = {
      find: jest.fn(),
      generateRefreshToken: jest.fn(),
      generateAccessToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("register", () => {
    it("should process registration payload and return creation response", async () => {
      const payload: CreateUserDto = {
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
      };

      const mockResult = {
        success: true,
        message: "Successfully register new account.",
      };

      authService.create.mockResolvedValue(mockResult);

      const result = await controller.register(payload);

      expect(authService.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockResult);
    });

    it("should propagate ConflictException if registration fails due to existing email", async () => {
      const payload: CreateUserDto = {
        name: "Duplicate User",
        email: "existing@example.com",
        password: "Password123!",
      };

      authService.create.mockRejectedValue(
        new ConflictException("Email already exists!"),
      );

      await expect(controller.register(payload)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("login", () => {
    it("should authenticate login payload, set HTTP-only refresh cookie, and return access_token", async () => {
      const payload: LoginDto = {
        email: "user@example.com",
        password: "Password123!",
      };

      const res = mockResponse();
      authService.login.mockResolvedValue({
        access_token: "access_token_123",
        refresh_token: "refresh_token_abc",
      });

      const result = await controller.login(payload, res);

      expect(authService.login).toHaveBeenCalledWith(payload);
      expect(res.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "refresh_token_abc",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/auth",
        }),
      );
      expect(result).toEqual({ access_token: "access_token_123" });
    });

    it("should propagate UnauthorizedException if password is invalid", async () => {
      const payload: LoginDto = {
        email: "user@example.com",
        password: "WrongPassword!",
      };

      const res = mockResponse();
      authService.login.mockRejectedValue(
        new UnauthorizedException("Invalid credentials!"),
      );

      await expect(controller.login(payload, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("refresh", () => {
    it("should throw UnauthorizedException if no refresh_token cookie is provided", async () => {
      const res = mockResponse();

      await expect(controller.refresh("", res)).rejects.toThrow(
        new UnauthorizedException("No token provided!"),
      );
    });

    it("should throw UnauthorizedException if refresh token is invalid or expired", async () => {
      const res = mockResponse();
      tokenService.find.mockResolvedValue(null);

      await expect(
        controller.refresh("invalid_refresh_token", res),
      ).rejects.toThrow(new UnauthorizedException("Invalid token."));
    });

    it("should issue new access token, rotate refresh token cookie, and return new access_token", async () => {
      const res = mockResponse();

      tokenService.find.mockResolvedValue({
        user_id: "user-123",
        expires_at: "2026-08-20T00:00:00Z",
        revoked_at: null,
      });

      tokenService.generateRefreshToken.mockResolvedValue(
        "new_refresh_token_999",
      );
      tokenService.generateAccessToken.mockResolvedValue(
        "new_access_token_777",
      );

      const result = await controller.refresh("valid_old_refresh_token", res);

      expect(tokenService.find).toHaveBeenCalledWith("valid_old_refresh_token");
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(
        "user-123",
      );
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        sub: "user-123",
      });
      expect(res.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "new_refresh_token_999",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/auth",
        }),
      );
      expect(result).toEqual({ access_token: "new_access_token_777" });
    });
  });

  describe("me", () => {
    it("should return profile data for current authenticated user", async () => {
      const currentUser = { id: "user-uuid-101" };
      const mockProfile = {
        id: "user-uuid-101",
        email: "user@example.com",
        name: "Jane Doe",
      };

      authService.me.mockResolvedValue(mockProfile);

      const result = await controller.me(currentUser);

      expect(authService.me).toHaveBeenCalledWith("user-uuid-101");
      expect(result).toEqual(mockProfile);
    });
  });

  describe("googleCallback", () => {
    it("should call findOrCreateIdentity, set refresh_token cookie, and return access_token", async () => {
      const oauthUser = {
        id: "google-oauth-id-123",
        email: "google@example.com",
        name: "Google User",
      };
      const res = mockResponse();

      authService.findOrCreateIdentity.mockResolvedValue({
        access_token: "google_access_token_abc",
        refresh_token: "google_refresh_token_xyz",
      });

      const result = await controller.googleCallback(oauthUser, res);

      expect(authService.findOrCreateIdentity).toHaveBeenCalledWith({
        id: "google-oauth-id-123",
        email: "google@example.com",
        name: "Google User",
        provider: "google",
      });
      expect(res.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "google_refresh_token_xyz",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/auth",
        }),
      );
      expect(result).toEqual({ access_token: "google_access_token_abc" });
    });
  });
});
