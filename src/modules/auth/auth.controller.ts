import { Cookies } from "@/core/decorators/cookie.decorator";
import { ValidationPipe } from "@/core/pipes/validation.pipe";
import { AuthService } from "@/modules/auth/auth.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { CreateUserDto, LoginDto } from "@/modules/auth/dto";
import { GoogleAuthGuard } from "@/modules/auth/guards/google-auth.guard";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CreateUserSchema, LoginSchema } from "@/modules/auth/schemas";
import { TokenService } from "@/modules/auth/tokens/token.service";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import type { Response } from "express";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
  ) {}

  @Post("/register")
  @UsePipes(new ValidationPipe(CreateUserSchema))
  @HttpCode(201)
  register(@Body() payload: CreateUserDto) {
    const result = this.authService.create(payload);

    return result;
  }

  @Post("/login")
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

  @Post("/refresh")
  async refresh(
    @Cookies("refresh_token") refreshToken: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!refreshToken) throw new UnauthorizedException("No token provided!");

    const active = await this.tokenService.find(refreshToken);

    if (!active) throw new UnauthorizedException("Invalid token.");

    const newRefreshToken = await this.tokenService.generateRefreshToken(
      active.user_id,
    );
    const newAccessToken = await this.tokenService.generateAccessToken({
      sub: active.user_id,
    });

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

  @Get("/me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  me(@CurrentUser() user: { id: string }) {
    const result = this.authService.me(user.id);

    return result;
  }

  @Get("/google")
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get("/google/callback")
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
}
