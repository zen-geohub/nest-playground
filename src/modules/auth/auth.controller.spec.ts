/* eslint-disable @typescript-eslint/unbound-method */
import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dto";

describe("AuthController", () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      create: jest.fn(),
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
});
