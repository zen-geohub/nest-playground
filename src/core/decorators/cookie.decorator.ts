import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

/**
 * Parameter decorator that extracts specified cookies or all cookies from the incoming Express request.
 *
 * @example
 * ```ts
 * \@Post('refresh')
 * refresh(\@Cookies('refresh_token') token: string)
 * ```
 */
export const Cookies = createParamDecorator(
  (
    data: string | undefined,
    ctx: ExecutionContext,
  ): string | Record<string, string> | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const cookies = (request.cookies ?? {}) as Record<string, string>;

    return data ? cookies[data] : cookies;
  },
);
