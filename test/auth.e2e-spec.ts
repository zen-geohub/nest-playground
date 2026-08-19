/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DatabaseService } from "../src/database/database.service";
import { EmailService } from "../src/modules/email/email.service";
import { hash } from "../src/utils/argon";

describe("AuthController (e2e)", () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockUser = {
    id: "user-uuid-e2e-101",
    email: "e2e.user@example.com",
    password: "",
    name: "E2E User",
    role: "user",
    email_verified_at: null as string | null,
  };

  const mockDbService = {
    query: jest.fn().mockImplementation(async (text: string, params: any[]) => {
      // findUserByEmail
      if (text.includes("LOWER(email) = LOWER($1)")) {
        const emailParam = params[0];
        if (emailParam?.toLowerCase() === mockUser.email.toLowerCase()) {
          return { rows: [mockUser], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // findUserById
      if (text.includes("WHERE id = $1")) {
        const idParam = params[0];
        if (idParam === mockUser.id) {
          return { rows: [mockUser], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // insertUser
      if (text.includes("INSERT INTO users")) {
        return { rows: [{ id: mockUser.id }], rowCount: 1 };
      }

      // insert user_tokens or user_sessions
      if (
        text.includes("INSERT INTO user_tokens") ||
        text.includes("INSERT INTO user_sessions")
      ) {
        return { rows: [], rowCount: 1 };
      }

      // findByToken / verify user_tokens
      if (text.includes("FROM user_tokens")) {
        if (params && params[0] === "valid_verification_hash") {
          return {
            rows: [
              {
                id: "token-1",
                user_id: mockUser.id,
                type: "email_verification",
                token: "valid_verification_hash",
                expires_at: new Date(Date.now() + 10000).toISOString(),
                used_at: null,
              },
            ],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      }

      // user_sessions findToken & revokeTokenSession
      if (text.includes("user_sessions")) {
        if (params && params[0] === "valid_session_hash") {
          return {
            rows: [
              {
                user_id: mockUser.id,
                expires_at: new Date(Date.now() + 10000).toISOString(),
                revoked_at: null,
              },
            ],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    }),

    transaction: jest.fn().mockImplementation(async (cb: any) => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValue({ rows: [{ id: mockUser.id }], rowCount: 1 }),
      };
      return cb(mockClient);
    }),

    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendForgotPasswordEmail: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    mockUser.password = await hash("Password123!");

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDbService)
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /auth/register", () => {
    it("should return 400 Bad Request when validation fails", () => {
      return request(app.getHttpServer())
        .post("/auth/register")
        .send({ email: "invalid-email" })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty("statusCode", 400);
          expect(res.body).toHaveProperty("message", "Validation failed");
        });
    });

    it("should register new user and return verification token on valid body", () => {
      return request(app.getHttpServer())
        .post("/auth/register")
        .send({
          name: "New E2E User",
          email: "new.e2e@example.com",
          password: "SecurePass123!",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("token");
          expect(typeof res.body.token).toBe("string");
        });
    });

    it("should return 409 Conflict if email is already registered", () => {
      return request(app.getHttpServer())
        .post("/auth/register")
        .send({
          name: "Existing User",
          email: mockUser.email,
          password: "Password123!",
        })
        .expect(409);
    });
  });

  describe("POST /auth/login", () => {
    it("should return 401 Unauthorized for incorrect password", () => {
      return request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: mockUser.email,
          password: "WrongPassword123!",
        })
        .expect(401);
    });

    it("should return 200 OK, access token, and refresh_token cookie on valid login", () => {
      return request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: mockUser.email,
          password: "Password123!",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("access_token");
          const cookies = res.get("Set-Cookie");
          expect(cookies).toBeDefined();
          expect(cookies[0]).toMatch(/refresh_token=/);
        });
    });
  });

  describe("POST /auth/refresh", () => {
    it("should return 401 Unauthorized if no refresh token cookie is provided", () => {
      return request(app.getHttpServer()).post("/auth/refresh").expect(401);
    });
  });

  describe("GET /auth/me", () => {
    it("should return 401 Unauthorized if no Bearer token is provided", () => {
      return request(app.getHttpServer()).get("/auth/me").expect(401);
    });

    it("should return user profile when valid Bearer token is provided", async () => {
      const validToken = await jwtService.signAsync({ sub: mockUser.id });

      return request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id", mockUser.id);
          expect(res.body).toHaveProperty("email", mockUser.email);
          expect(res.body).toHaveProperty("name", mockUser.name);
        });
    });
  });

  describe("POST /auth/logout", () => {
    it("should return 200 OK and clear refresh token cookie", () => {
      return request(app.getHttpServer())
        .post("/auth/logout")
        .set("Cookie", ["refresh_token=sample_refresh_token_123"])
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            success: true,
            message: "Logout.",
          });
        });
    });
  });
});
