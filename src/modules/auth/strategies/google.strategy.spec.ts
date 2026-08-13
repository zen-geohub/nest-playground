/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { GoogleStrategy } from "./google.strategy";

describe("GoogleStrategy", () => {
  let strategy: GoogleStrategy;

  beforeEach(() => {
    const mockConfig = {
      google: {
        id: "mock_google_client_id",
        secret: "mock_google_client_secret",
      },
    };

    strategy = new GoogleStrategy(mockConfig as any);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("should transform Google OAuth profile into normalized user object", () => {
      const profile = {
        id: "google-123456",
        displayName: "John Google",
        emails: [{ value: "john.google@example.com" }],
      };

      const result = strategy.validate(
        "mock_access_token",
        "mock_refresh_token",
        profile,
      );

      expect(result).toEqual({
        provider: "google",
        id: "google-123456",
        email: "john.google@example.com",
        name: "John Google",
      });
    });

    it("should handle profile with undefined emails array safely", () => {
      const profile = {
        id: "google-7890",
        displayName: "No Email User",
        emails: undefined,
      };

      const result = strategy.validate("access", "refresh", profile);

      expect(result).toEqual({
        provider: "google",
        id: "google-7890",
        email: undefined,
        name: "No Email User",
      });
    });
  });
});
