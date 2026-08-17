import { Cookies } from "@/core/decorators/cookie.decorator";
import { ValidationPipe } from "@/core/pipes/validation.pipe";
import { AuthService } from "@/modules/auth/auth.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { CreateUserDto, LoginDto, VerifyEmailDto } from "@/modules/auth/dto";
import { GoogleAuthGuard } from "@/modules/auth/guards/google-auth.guard";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import {
  CreateUserSchema,
  LoginSchema,
  VerifyEmailSchema,
} from "@/modules/auth/schemas";
import { SessionService } from "@/modules/auth/sessions/session.service";
import { TokenService } from "@/modules/auth/tokens/token.service";
import { EmailService } from "@/modules/email/email.service";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import Joi from "joi";

/**
 * Controller exposing authentication endpoints including user registration,
 * email verification, password resets, token rotation, OAuth callback, and profile retrieval.
 */
@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Registers a new user account and dispatches an email verification token.
   *
   * @param payload - User registration DTO (name, email, password).
   * @returns Object containing the generated verification token.
   */
  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UsePipes(new ValidationPipe(CreateUserSchema))
  @HttpCode(201)
  @ApiOperation({ summary: "Register a new user account" })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: "User registered successfully. Verification token returned.",
    schema: {
      type: "object",
      properties: {
        token: { type: "string", example: "verification_token_string" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Validation error.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/register" },
        message: { type: "string", example: "Validation failed" },
        errors: {
          type: "object",
          example: {
            email: '"email" is required',
            password: '"password" is required',
            name: '"name" is required',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: "Email already exists.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 409 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/register" },
        message: { type: "string", example: "Email already exists!" },
      },
    },
  })
  async register(@Body() payload: CreateUserDto) {
    const { token } = await this.authService.create(payload);
    await this.emailService.sendVerificationEmail(payload.email, token);

    return { token };
  }

  /**
   * Authenticates user credentials, sets an HTTP-only refresh token cookie, and returns a short-lived access token.
   *
   * @param payload - Login credentials DTO (email, password).
   * @param response - Express Response object for cookie setting.
   * @returns Object containing the JWT access token.
   * @throws UnauthorizedException if password verification fails.
   * @throws NotFoundException if user email is not registered.
   */
  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ValidationPipe(LoginSchema))
  @HttpCode(200)
  @ApiOperation({
    summary: "Authenticate user credentials and obtain access token",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description:
      "Authenticated successfully. Returns access token and sets refresh token cookie.",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string", example: "eyJhbGciOiJIUzI1Ni..." },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Validation error.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/login" },
        message: { type: "string", example: "Validation failed" },
        errors: {
          type: "object",
          example: {
            email: '"email" is required',
            password: '"password" is required',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 401 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/login" },
        message: { type: "string", example: "Invalid credentials!" },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 404 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/login" },
        message: { type: "string", example: "User not found!" },
      },
    },
  })
  async login(
    @Body() payload: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, refresh_token } =
      await this.authService.login(payload);

    response.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
    });

    return {
      access_token,
    };
  }

  /**
   * Rotates an active refresh token session and issues a new access token.
   *
   * @param refreshToken - Raw refresh token extracted from HTTP-only cookie.
   * @param response - Express Response object for setting the new refresh token cookie.
   * @returns Object containing the newly issued JWT access token.
   * @throws UnauthorizedException if the refresh token is missing, invalid, or revoked.
   */
  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({
    summary: "Rotate refresh token session and issue new access token",
  })
  @ApiCookieAuth("refresh_token")
  @ApiResponse({
    status: 200,
    description:
      "Token session rotated successfully. Returns new access token.",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string", example: "eyJhbGciOiJIUzI1Ni..." },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Missing, invalid, or expired refresh token.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 401 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/refresh" },
        message: { type: "string", example: "Invalid or expired token." },
      },
    },
  })
  async refresh(
    @Cookies("refresh_token") refreshToken: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!refreshToken) throw new UnauthorizedException("No token provided!");

    const active = await this.sessionService.find(refreshToken);

    if (!active) throw new UnauthorizedException("Invalid or expired token.");

    const newRefreshToken = await this.sessionService.generateRefreshToken(
      active.user_id,
    );
    const newAccessToken = await this.sessionService.generateAccessToken(
      active.user_id,
    );

    response.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
    });

    return {
      access_token: newAccessToken,
    };
  }

  /**
   * Verifies a user's email address using a valid verification token.
   *
   * @param query - Query object containing the verification token.
   * @returns Success response object.
   * @throws InternalServerErrorException if verification fails.
   */
  @Get("verify-email")
  @HttpCode(200)
  @ApiOperation({ summary: "Verify user email address using token" })
  @ApiQuery({
    name: "token",
    type: String,
    description: "Email verification token",
  })
  @ApiResponse({
    status: 200,
    description: "Email address verified successfully.",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Email verified." },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or expired token.",
    schema: {
      type: "object",
      properties: {
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/verify-email" },
        message: { type: "string", example: "Invalid or expired token." },
      },
    },
  })
  async verifyEmail(
    @Query(new ValidationPipe(VerifyEmailSchema)) { token }: VerifyEmailDto,
  ) {
    const verified = await this.tokenService.verifyToken(
      token,
      "email_verification",
    );

    if (!verified)
      throw new InternalServerErrorException("Internal server error.");

    return {
      success: true,
      message: "Email verified.",
    };
  }

  /**
   * Resends an email verification link to an unverified registered user.
   *
   * @param payload - Object containing the user's email address.
   * @returns Object containing the new verification token.
   * @throws BadRequestException if the email is not found or already verified.
   */
  @Post("resend-verification")
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: "Resend email verification link" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", example: "jane.doe@example.com" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Verification email resent.",
    schema: {
      type: "object",
      properties: { token: { type: "string", example: "random opaque token" } },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Email not found or already verified.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/resend-verification" },
        message: { type: "string", example: "Email already verified!" },
      },
    },
  })
  async resendVerification(
    @Body(
      new ValidationPipe(
        Joi.object({
          email: Joi.string().email().lowercase().trim().required(),
        }),
      ),
    )
    { email }: { email: string },
  ) {
    const { token } = await this.authService.resendVerifEmail(email);
    await this.emailService.sendVerificationEmail(email, token);
    return { token };
  }

  /**
   * Initiates a password reset request by generating a reset token and sending a reset email.
   *
   * @param payload - Object containing the user's target email address.
   * @returns Object containing the generated password reset token.
   */
  @Post("forgot-password")
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: "Request password reset email" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", example: "jane.doe@example.com" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Password reset link generated and email sent.",
    schema: {
      type: "object",
      properties: { token: { type: "string", example: "random opaque token" } },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Email not found.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/forgot-password" },
        message: { type: "string", example: "Email not found!" },
      },
    },
  })
  async forgotPassword(
    @Body(
      new ValidationPipe(
        Joi.object({
          email: Joi.string().lowercase().trim().required(),
        }),
      ),
    )
    { email }: { email: string },
  ) {
    const { token } = await this.authService.forgotPasswordEmail(email);
    await this.emailService.sendForgotPasswordEmail(email, token);
    return { token };
  }

  /**
   * Resets a user's password using a valid password reset token.
   *
   * @param payload - Object containing the reset token and new password.
   * @returns Promise resolving to update confirmation message.
   */
  @Post("reset-password")
  @HttpCode(200)
  @ApiOperation({ summary: "Reset password using reset token" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["token", "password"],
      properties: {
        token: { type: "string", example: "reset_token_string" },
        password: { type: "string", example: "NewSecurePass123!" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Password successfully changed.",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Password successfully changed." },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or expired reset token.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/reset-password" },
        message: { type: "string", example: "Invalid or expired token." },
      },
    },
  })
  resetPassword(
    @Body(
      new ValidationPipe(
        Joi.object({
          token: Joi.string().required(),
          password: Joi.string().required(),
        }),
      ),
    )
    { token, password }: { token: string; password: string },
  ) {
    return this.authService.updateNewPassword(token, password);
  }

  /**
   * Retrieves profile information for the currently authenticated user.
   *
   * @param user - Authenticated user payload extracted from JWT guard.
   * @returns Profile details of current user.
   * @throws NotFoundException if user profile is not found.
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: "Get current authenticated user profile" })
  @ApiBearerAuth("JWT-auth")
  @ApiResponse({
    status: 200,
    description: "User profile details retrieved successfully.",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "user-uuid-123" },
        email: { type: "string", example: "jane.doe@example.com" },
        name: { type: "string", example: "Jane Doe" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized access token.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 401 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/me" },
        message: { type: "string", example: "Unauthorized" },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 404 },
        timestamp: { type: "string", example: "2026-08-16T16:08:06.371Z" },
        path: { type: "string", example: "/auth/me" },
        message: { type: "string", example: "User not found!" },
      },
    },
  })
  me(@CurrentUser() user: { id: string }) {
    return this.authService.me(user.id);
  }

  /**
   * Initiates Google OAuth2 authentication redirect flow.
   */
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Initiate Google OAuth2 authentication flow" })
  googleLogin() {}

  /**
   * Handles Google OAuth2 authentication callback, linking/creating user identity and returning access token.
   *
   * @param user - OAuth profile payload extracted from GoogleAuthGuard.
   * @param response - Express Response object for setting the refresh token cookie.
   * @returns Object containing the JWT access token.
   */
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Handle Google OAuth2 callback" })
  @ApiResponse({
    status: 200,
    description:
      "OAuth login successful. Returns access token and sets refresh token cookie.",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string", example: "eyJhbGciOiJIUzI1Ni..." },
      },
    },
  })
  async googleCallback(
    @CurrentUser() user: { id: string; email: string; name: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, refresh_token } =
      await this.authService.findOrCreateIdentity({
        ...user,
        provider: "google",
      });

    response.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
    });

    return {
      access_token,
    };
  }

  /**
   * Logs out the user by revoking the refresh token session and clearing the refresh token cookie.
   *
   * @param refreshToken - Raw refresh token from cookie.
   * @param response - Express Response object for clearing cookie.
   * @returns Success response message.
   */
  @Post("logout")
  @HttpCode(200)
  @ApiOperation({ summary: "Revoke active refresh token session and logout" })
  @ApiCookieAuth("refresh_token")
  @ApiResponse({
    status: 200,
    description: "Logged out successfully and cookie cleared.",
  })
  async logout(
    @Cookies("refresh_token") refreshToken: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessionService.logout(refreshToken);

    response.clearCookie("refresh_token", { path: "/auth" });

    return {
      success: true,
      message: "Logout.",
    };
  }
}
