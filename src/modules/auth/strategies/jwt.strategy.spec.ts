import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const mockEnvConfig = {
      access_secret: "test_jwt_secret_key_123",
    };

    strategy = new JwtStrategy(mockEnvConfig);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("should extract user ID from sub property of JWT payload", () => {
      const payload = { sub: "user-uuid-999" };
      const result = strategy.validate(payload);

      expect(result).toEqual({ id: "user-uuid-999" });
    });
  });
});
