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

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
  ) {}

  @Post("register")
  @Throttle({ defeault: { limit: 3, ttl: 60_000 } })
  @UsePipes(new ValidationPipe(CreateUserSchema))
  @HttpCode(201)
  async register(@Body() payload: CreateUserDto) {
    const { token } = await this.authService.create(payload);
    await this.emailService.sendVerificationEmail(payload.email, token);

    return { token };
  }

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

  @Get("verify-email")
  @HttpCode(200)
  verifyEmail(
    @Query(new ValidationPipe(VerifyEmailSchema)) { token }: VerifyEmailDto,
  ) {
    return this.tokenService.verifyToken(token);
  }

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

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  me(@CurrentUser() user: { id: string }) {
    const result = this.authService.me(user.id);

    return result;
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

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
