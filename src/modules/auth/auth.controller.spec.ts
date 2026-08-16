/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CreateUserDto, LoginDto } from "./dto";
import { SessionService } from "./sessions/session.service";
import { TokenService } from "./tokens/token.service";
import { EmailService } from "../email/email.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let tokenService: jest.Mocked<TokenService>;
  let sessionService: jest.Mocked<SessionService>;
  let emailService: jest.Mocked<EmailService>;

  const mockResponse = () => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const mockAuthService = {
      create: jest.fn(),
      login: jest.fn(),
      me: jest.fn(),
      findOrCreateIdentity: jest.fn(),
      resendVerifEmail: jest.fn(),
    };

    const mockTokenService = {
      verifyToken: jest.fn(),
    };

    const mockSessionService = {
      find: jest.fn(),
      generateRefreshToken: jest.fn(),
      generateAccessToken: jest.fn(),
      logout: jest.fn(),
    };

    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    sessionService = module.get(SessionService);
    emailService = module.get(EmailService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("register", () => {
    it("should process registration payload, send verification email, and return token", async () => {
      const payload: CreateUserDto = {
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
      };

      authService.create.mockResolvedValue({ token: "verif_token_123" });
      emailService.sendVerificationEmail.mockResolvedValue(true);

      const result = await controller.register(payload);

      expect(authService.create).toHaveBeenCalledWith(payload);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        "test@example.com",
        "verif_token_123",
      );
      expect(result).toEqual({ token: "verif_token_123" });
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

  describe("verifyEmail", () => {
    it("should delegate token verification to tokenService.verifyToken", async () => {
      const mockResult = { success: true, message: "Email verified." };
      tokenService.verifyToken.mockResolvedValue(mockResult);

      const result = await controller.verifyEmail({ token: "valid_token" });

      expect(tokenService.verifyToken).toHaveBeenCalledWith(
        "valid_token",
        "email_verification",
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("resendVerification", () => {
    it("should generate new token, send email, and return token", async () => {
      authService.resendVerifEmail.mockResolvedValue({
        token: "new_token_456",
      });
      emailService.sendVerificationEmail.mockResolvedValue(true);

      const result = await controller.resendVerification({
        email: "user@example.com",
      });

      expect(authService.resendVerifEmail).toHaveBeenCalledWith(
        "user@example.com",
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        "user@example.com",
        "new_token_456",
      );
      expect(result).toEqual({ token: "new_token_456" });
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
      sessionService.find.mockResolvedValue(null);

      await expect(
        controller.refresh("invalid_refresh_token", res),
      ).rejects.toThrow(new UnauthorizedException("Invalid or expired token."));
    });

    it("should issue new access token, rotate refresh token cookie, and return new access_token", async () => {
      const res = mockResponse();

      sessionService.find.mockResolvedValue({
        user_id: "user-123",
        expires_at: "2026-08-22T00:00:00Z",
        revoked_at: null,
      });

      sessionService.generateRefreshToken.mockResolvedValue(
        "new_refresh_token_999",
      );
      sessionService.generateAccessToken.mockResolvedValue(
        "new_access_token_777",
      );

      const result = await controller.refresh("valid_old_refresh_token", res);

      expect(sessionService.find).toHaveBeenCalledWith(
        "valid_old_refresh_token",
      );
      expect(sessionService.generateRefreshToken).toHaveBeenCalledWith(
        "user-123",
      );
      expect(sessionService.generateAccessToken).toHaveBeenCalledWith(
        "user-123",
      );
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

  describe("logout", () => {
    it("should revoke session, clear refresh_token cookie, and return success response", async () => {
      const res = mockResponse();
      sessionService.logout.mockResolvedValue(undefined);

      const result = await controller.logout("refresh_token_to_revoke", res);

      expect(sessionService.logout).toHaveBeenCalledWith(
        "refresh_token_to_revoke",
      );
      expect(res.clearCookie).toHaveBeenCalledWith("refresh_token", {
        path: "/auth",
      });
      expect(result).toEqual({
        success: true,
        message: "Logout.",
      });
    });
  });
});
