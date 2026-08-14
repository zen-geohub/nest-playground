/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { ExecutionContext } from "@nestjs/common";
import { Cookies } from "./cookie.decorator";

describe("Cookies Decorator", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getParamDecoratorFactory = (_decorator: any) => {
    class TestClass {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      testMethod(@Cookies() _cookies: any) {}
    }

    const metadata = Reflect.getMetadata(
      "__routeArguments__",
      TestClass,
      "testMethod",
    );
    const key = Object.keys(metadata)[0];
    return metadata[key].factory;
  };

  const mockExecutionContext = (
    cookies?: Record<string, string>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          cookies,
        }),
      }),
    }) as any;

  it("should extract all cookies when no data argument is provided", () => {
    const factory = getParamDecoratorFactory(Cookies);
    const ctx = mockExecutionContext({ session_id: "xyz123", theme: "dark" });

    const result = factory(undefined, ctx);

    expect(result).toEqual({ session_id: "xyz123", theme: "dark" });
  });

  it("should extract a specific cookie value when cookie name data argument is provided", () => {
    const factory = getParamDecoratorFactory(Cookies);
    const ctx = mockExecutionContext({
      refresh_token: "mock_refresh_token_123",
    });

    const result = factory("refresh_token", ctx);

    expect(result).toBe("mock_refresh_token_123");
  });

  it("should handle missing request cookies gracefully and return empty object or undefined", () => {
    const factory = getParamDecoratorFactory(Cookies);
    const ctx = mockExecutionContext(undefined);

    const allResult = factory(undefined, ctx);
    expect(allResult).toEqual({});

    const specificResult = factory("refresh_token", ctx);
    expect(specificResult).toBeUndefined();
  });
});
