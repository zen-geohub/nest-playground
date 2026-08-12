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
    it("should return user record array if user exists", async () => {
      const mockUser = {
        id: "uuid-1234",
        email: "existing@example.com",
        name: "Existing User",
      };

      dbService.query.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findUserByEmail("existing@example.com");

      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT\s+id,\s*email,\s*name\s+FROM\s+users/i),
        ["existing@example.com"],
      );
      expect(result).toEqual([mockUser]);
    });

    it("should return empty array if user does not exist", async () => {
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

  describe("insertUser", () => {
    const validPayload: CreateUserDto = {
      name: "Test User",
      email: "newuser@example.com",
      password: "hashed_password_123",
    };

    it("should successfully insert a new user when email is not registered", async () => {
      // 1st query: findUserByEmail -> empty
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // 2nd query: INSERT -> rowCount 1
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
      // 1st query: findUserByEmail -> user exists
      dbService.query.mockResolvedValueOnce({
        rows: [
          {
            id: "uuid-9999",
            email: "newuser@example.com",
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

      // Verify INSERT query was NOT executed due to early check
      expect(dbService.query).toHaveBeenCalledTimes(1);
    });

    it("should throw HttpException (500) if database insert fails to affect rows", async () => {
      // 1st query: findUserByEmail -> empty
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // 2nd query: INSERT -> rowCount 0
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

    it("should propagate database connection errors if db.query fails", async () => {
      dbService.query.mockRejectedValueOnce(
        new Error("Fatal postgres connection error"),
      );

      await expect(repository.insertUser(validPayload)).rejects.toThrow(
        "Fatal postgres connection error",
      );
    });
  });
});
