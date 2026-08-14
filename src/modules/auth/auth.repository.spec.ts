/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
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
      transaction: jest.fn(),
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
    it("should query user by lowercase email and return single user object if found", async () => {
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
      expect(result).toEqual(mockUser);
    });

    it("should return null if user email is not found", async () => {
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

      expect(result).toBeNull();
    });
  });

  describe("findUserById", () => {
    it("should query user by ID and return user object if found", async () => {
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
      expect(result).toEqual(mockUser);
    });

    it("should return null if user ID does not exist", async () => {
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findUserById("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("insertUser", () => {
    const validPayload: CreateUserDto = {
      name: "Test User",
      email: "newuser@example.com",
      password: "hashed_password_123",
    };

    it("should insert user when email is not registered", async () => {
      // findUserByEmail -> null
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
      // findUserByEmail -> user object returned
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

  describe("findOrCreateIdentity", () => {
    const oauthPayload = {
      provider: "google",
      id: "google-id-777",
      email: "oauth@example.com",
      name: "OAuth User",
    };

    it("should return existing identity user ID if identity already linked", async () => {
      // 1st query: findIdentity -> identity found
      dbService.query.mockResolvedValueOnce({
        rows: [{ user_id: "existing-user-uuid-1" }],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findOrCreateIdentity(oauthPayload);

      expect(result).toEqual({
        userId: "existing-user-uuid-1",
        isNewUser: false,
      });
      expect(dbService.query).toHaveBeenCalledTimes(1);
    });

    it("should link identity to existing user if email matches existing user", async () => {
      // 1st query: findIdentity -> null
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // 2nd query: findUserByEmail -> user found
      dbService.query.mockResolvedValueOnce({
        rows: [
          {
            id: "existing-user-uuid-2",
            email: "oauth@example.com",
            password: "",
            name: "OAuth User",
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // 3rd query: INSERT into auth_identities
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: "INSERT",
        oid: 0,
        fields: [],
      });

      const result = await repository.findOrCreateIdentity(oauthPayload);

      expect(result).toEqual({
        userId: "existing-user-uuid-2",
        isNewUser: false,
      });
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO auth_identities/i),
        ["existing-user-uuid-2", "google", "google-id-777"],
      );
    });

    it("should create new user and identity inside transaction for completely new OAuth user", async () => {
      // 1st query: findIdentity -> null
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // 2nd query: findUserByEmail -> null
      dbService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      // Mock transaction execution callback
      dbService.transaction.mockImplementationOnce(async (cb: any) => {
        const mockClient = {
          query: jest
            .fn()
            .mockResolvedValueOnce({
              rows: [{ id: "new-user-uuid-3" }],
              rowCount: 1,
            })
            .mockResolvedValueOnce({
              rows: [],
              rowCount: 1,
            }),
        };
        return cb(mockClient);
      });

      const result = await repository.findOrCreateIdentity(oauthPayload);

      expect(result).toEqual({
        userId: "new-user-uuid-3",
        isNewUser: true,
      });
      expect(dbService.transaction).toHaveBeenCalled();
    });
  });
});
