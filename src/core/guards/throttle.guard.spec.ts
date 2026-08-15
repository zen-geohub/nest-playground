/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { ThrottlerException } from "@nestjs/throttler";
import { ThrottleGuard } from "./throttle.guard";

describe("ThrottleGuard", () => {
  let guard: ThrottleGuard;

  beforeEach(() => {
    guard = new ThrottleGuard({} as any, {} as any, {} as any);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("throwThrottlingException", () => {
    it("should throw ThrottlerException with custom 'Too many requests!' message", () => {
      expect(() => (guard as any).throwThrottlingException()).toThrow(
        new ThrottlerException("Too many requests!"),
      );
    });
  });
});
