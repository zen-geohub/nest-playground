/* eslint-disable @typescript-eslint/unbound-method */
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CreateUserDto, LoginDto } from "./dto";

describe("AuthController", () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      create: jest.fn(),
      login: jest.fn(),
      me: jest.fn(),
      findOrCreateIdentity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
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

      const mockResponse = {
        success: true,
        message: "Successfully register new account.",
      };

      service.create.mockResolvedValue(mockResponse);

      const result = await controller.register(payload);

      expect(service.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockResponse);
    });

    it("should propagate ConflictException if registration fails due to existing email", async () => {
      const payload: CreateUserDto = {
        name: "Duplicate User",
        email: "existing@example.com",
        password: "Password123!",
      };

      service.create.mockRejectedValue(
        new ConflictException("Email already exists!"),
      );

      await expect(controller.register(payload)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("login", () => {
    it("should authenticate login payload and return access_token", async () => {
      const payload: LoginDto = {
        email: "user@example.com",
        password: "Password123!",
      };

      const mockResponse = { access_token: "jwt_token_xyz" };
      service.login.mockResolvedValue(mockResponse);

      const result = await controller.login(payload);

      expect(service.login).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockResponse);
    });

    it("should propagate NotFoundException if user is not found", async () => {
      const payload: LoginDto = {
        email: "notfound@example.com",
        password: "Password123!",
      };

      service.login.mockRejectedValue(new NotFoundException("User not found!"));

      await expect(controller.login(payload)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should propagate UnauthorizedException if password is invalid", async () => {
      const payload: LoginDto = {
        email: "user@example.com",
        password: "WrongPassword!",
      };

      service.login.mockRejectedValue(
        new UnauthorizedException("Invalid credentials!"),
      );

      await expect(controller.login(payload)).rejects.toThrow(
        UnauthorizedException,
      );
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

      service.me.mockResolvedValue(mockProfile);

      const result = await controller.me(currentUser);

      expect(service.me).toHaveBeenCalledWith("user-uuid-101");
      expect(result).toEqual(mockProfile);
    });
  });

  describe("googleCallback", () => {
    it("should call findOrCreateIdentity with Google provider and user details", async () => {
      const oauthUser = {
        id: "google-oauth-id-123",
        email: "google@example.com",
        name: "Google User",
      };

      const mockResponse = { access_token: "google_access_token_abc" };
      service.findOrCreateIdentity.mockResolvedValue(mockResponse);

      const result = await controller.googleCallback(oauthUser);

      expect(service.findOrCreateIdentity).toHaveBeenCalledWith({
        id: "google-oauth-id-123",
        email: "google@example.com",
        name: "Google User",
        provider: "google",
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
