import { Cookies } from "@/core/decorators/cookie.decorator";
import { ValidationPipe } from "@/core/pipes/validation.pipe";
import { AuthService } from "@/modules/auth/auth.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type {
  CreateUserDto,
  LoginDto,
  VerifyEmailDto,
} from "@/modules/auth/dto";
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
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import Joi from "joi";

/**
 * Controller exposing authentication endpoints including user registration,
 * email verification, password resets, token rotation, OAuth callback, and profile retrieval.
 */
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
  me(@CurrentUser() user: { id: string }) {
    const result = this.authService.me(user.id);

    return result;
  }

  /**
   * Initiates Google OAuth2 authentication redirect flow.
   */
  @Get("google")
  @UseGuards(GoogleAuthGuard)
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
