import { hash, verify } from "./argon";

describe("argon utils", () => {
  describe("hash", () => {
    it("should hash a plain text password and return argon2 string", async () => {
      const password = "SecretPassword123!";
      const hashedPassword = await hash(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe("string");
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toContain("$argon2id$");
    });
  });

  describe("verify", () => {
    it("should return true for correct password and hash", async () => {
      const password = "SecretPassword123!";
      const hashedPassword = await hash(password);

      const isValid = await verify(hashedPassword, password);
      expect(isValid).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      const password = "SecretPassword123!";
      const hashedPassword = await hash(password);

      const isValid = await verify(hashedPassword, "WrongPassword");
      expect(isValid).toBe(false);
    });
  });
});
