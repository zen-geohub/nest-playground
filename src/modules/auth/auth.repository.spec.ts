/* eslint-disable @typescript-eslint/unbound-method */
import { DatabaseService } from "../../database/database.service";
import { ConflictException, HttpException, HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthRepository } from "./auth.repository";
import { CreateUserDto } from "./dto";

describe("AuthRepository", () => {
  let repository: AuthRepository;
  let dbService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    const mockDbService = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
      ],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
    dbService = module.get(DatabaseService);
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("findUserByEmail", () => {
    it("should query user by lowercase email and return matching records", async () => {
      const mockUser = {
        id: "uuid-1234",
        email: "existing@example.com",
        password: "$argon2id$v=19$m=65536,t=3,p=4$hash",
        name: "Existing User",
      };

      dbService.query.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findUserByEmail("Existing@Example.com");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(/LOWER\(email\)\s*=\s*LOWER\(\$1\)/i),
        ["Existing@Example.com"],
      );
      expect(result).toEqual([mockUser]);
    });

    it("should return empty array if user email is not found", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findUserByEmail(
        "nonexistent@example.com",
      );

      expect(result).toEqual([]);
    });
  });

  describe("findUserById", () => {
    it("should query user by ID and return matching user records", async () => {
      const mockUser = {
        id: "uuid-5555",
        email: "user@example.com",
        password: "$argon2id$hash",
        name: "User Five",
      };

      dbService.query.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findUserById("uuid-5555");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE id = \$1/i),
        ["uuid-5555"],
      );
      expect(result).toEqual([mockUser]);
    });

    it("should return empty array if user ID does not exist", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findUserById("nonexistent-id");

      expect(result).toEqual([]);
    });
  });

  describe("insertUser", () => {
    const validPayload: CreateUserDto = {
      name: "Test User",
      email: "newuser@example.com",
      password: "hashed_password_123",
    };

    it("should insert user when email is not registered", async () => {
      // findUserByEmail -> empty
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // INSERT -> rowCount 1
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: "INSERT",
        oid: 0,
        fields: [],
      });

      const result = await repository.insertUser(validPayload);

      expect(result).toEqual({
        success: true,
        message: "Successfully register new account.",
      });
      expect(dbService.query).toHaveBeenCalledTimes(2);
    });

    it("should throw ConflictException if duplicate email registration is attempted", async () => {
      // findUserByEmail -> user exists
      dbService.query.mockResolvedValueOnce({
        rows: [
          {
            id: "uuid-9999",
            email: "newuser@example.com",
            password: "hash",
            name: "Duplicate User",
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await expect(repository.insertUser(validPayload)).rejects.toThrow(
        new ConflictException("Email already exists!"),
      );

      expect(dbService.query).toHaveBeenCalledTimes(1);
    });

    it("should throw HttpException (500) if insert fails to affect rows", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "INSERT",
        oid: 0,
        fields: [],
      });

      await expect(repository.insertUser(validPayload)).rejects.toThrow(
        new HttpException(
          "Internal server error.",
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
