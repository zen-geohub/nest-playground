/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { ArgumentsHost, BadRequestException, HttpStatus } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { AllExceptionFilter } from "./all-exception.filter";

describe("AllExceptionFilter", () => {
  let filter: AllExceptionFilter;
  let logger: jest.Mocked<PinoLogger>;

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockRequest = (url = "/test-url") => ({
    url,
  });

  const mockHost = (req: any, res: any): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    }) as any;

  beforeEach(() => {
    logger = {
      setContext: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    filter = new AllExceptionFilter(logger);
  });

  it("should handle HttpException with string message", () => {
    const req = mockRequest("/auth/login");
    const res = mockResponse();
    const host = mockHost(req, res);
    const exception = new BadRequestException("Invalid credentials");

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: expect.any(String),
      path: "/auth/login",
      message: "Invalid credentials",
    });
  });

  it("should handle HttpException with validation object errors", () => {
    const req = mockRequest("/auth/register");
    const res = mockResponse();
    const host = mockHost(req, res);
    const exception = new BadRequestException({
      message: { email: '"email" must be a valid email' },
      error: "Bad Request",
    });

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: expect.any(String),
      path: "/auth/register",
      message: "Validation failed",
      errors: { email: '"email" must be a valid email' },
    });
  });

  it("should handle unexpected non-HttpException errors with 500 status", () => {
    const req = mockRequest("/unexpected");
    const res = mockResponse();
    const host = mockHost(req, res);
    const exception = new Error("Database connection dropped");

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: expect.any(String),
      path: "/unexpected",
      message: "Internal server error.",
    });
  });
});
