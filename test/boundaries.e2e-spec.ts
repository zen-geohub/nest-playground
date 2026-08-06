import { DatabaseService } from "@/database/database.service";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";

describe("BoundariesController (e2e)", () => {
  let app: INestApplication<App>;
  let mockDatabaseService: any;

  beforeEach(async () => {
    mockDatabaseService = {
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({
        rows: [
          { id: 31, name: "DKI Jakarta" },
          { id: 32, name: "Jawa Barat" },
        ],
      }),
      transaction: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDatabaseService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe("GET /boundaries", () => {
    it("should return 400 Bad Request if id query parameter is missing", () => {
      return request(app.getHttpServer())
        .get("/boundaries")
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe("ID is required!");
        });
    });

    it("should return 200 OK with boundary list when id is provided", () => {
      return request(app.getHttpServer())
        .get("/boundaries?id=3")
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([
            { id: 31, name: "DKI Jakarta" },
            { id: 32, name: "Jawa Barat" },
          ]);
        });
    });
  });

  describe("GET /boundaries/mvt/:z/:x/:y", () => {
    it("should return MVT coordinates path string", () => {
      return request(app.getHttpServer())
        .get("/boundaries/mvt/12/3200/1800")
        .expect(200)
        .expect("12 3200 1800");
    });
  });

  describe("POST /boundaries", () => {
    it("should echo payload with message", () => {
      return request(app.getHttpServer())
        .post("/boundaries")
        .send({ id: "3171" })
        .expect(201)
        .expect({
          message: "Hello world",
          id: "3171",
        });
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
