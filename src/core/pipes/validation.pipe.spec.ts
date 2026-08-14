/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { BadRequestException } from "@nestjs/common";
import { CreateUserSchema } from "../../modules/auth/schemas/create-user.schema";
import { ValidationPipe } from "./validation.pipe";

describe("ValidationPipe", () => {
  let pipe: ValidationPipe<any>;

  beforeEach(() => {
    pipe = new ValidationPipe(CreateUserSchema);
  });

  it("should pass validation and strip unknown fields for valid registration payload", () => {
    const input = {
      name: "Valid User",
      email: "valid@example.com",
      password: "SuperSecretPassword123!",
      unwantedField: "hack_attempt",
    };

    const result = pipe.transform(input);

    expect(result).toEqual({
      name: "Valid User",
      email: "valid@example.com",
      password: "SuperSecretPassword123!",
    });
    expect(result).not.toHaveProperty("unwantedField");
  });

  it("should throw BadRequestException with field-mapped error messages when payload is invalid", () => {
    const invalidInput = {
      name: "",
      email: "not-an-email",
      username: "a", // too short if schema enforces min length, or invalid format
      password: "short",
    };

    try {
      pipe.transform(invalidInput);
      fail("ValidationPipe should have thrown BadRequestException");
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = (err as BadRequestException).getResponse() as {
        message: Record<string, string>;
        error: string;
      };

      expect(response.error).toBe("Bad Request");
      expect(typeof response.message).toBe("object");
      expect(response.message).toHaveProperty("email");
    }
  });

  it("should report errors for completely empty object payload", () => {
    expect(() => pipe.transform({})).toThrow(BadRequestException);
  });
});
