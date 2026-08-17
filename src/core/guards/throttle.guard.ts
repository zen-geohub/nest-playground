import { Injectable } from "@nestjs/common";
import { ThrottlerException, ThrottlerGuard } from "@nestjs/throttler";

/**
 * Guard overriding default NestJS ThrottlerGuard exception handling to return a custom error message.
 */
@Injectable()
export class ThrottleGuard extends ThrottlerGuard {
  /**
   * Throws custom throttling exception when rate limits are exceeded.
   *
   * @throws ThrottlerException with "Too many requests!" message.
   */
  protected throwThrottlingException(): Promise<void> {
    throw new ThrottlerException("Too many requests!");
  }
}
