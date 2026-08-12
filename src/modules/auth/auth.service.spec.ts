/* eslint-disable @typescript-eslint/unbound-method */
import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PinoLogger } from "nestjs-pino";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dto";

describe("AuthService", () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findUserByEmail: jest.fn(),
      insertUser: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get(AuthRepository);
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

      // Verify password was securely hashed via argon2id
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
      expect(repository.insertUser).toHaveBeenCalled();
    });
  });
});
