import { ValidationPipe } from "@/core/pipes/validation.pipe";
import { AuthService } from "@/modules/auth/auth.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { CreateUserDto, LoginDto } from "@/modules/auth/dto";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CreateUserSchema, LoginSchema } from "@/modules/auth/schemas";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

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
  login(@Body() payload: LoginDto) {
    const result = this.authService.login(payload);

    return result;
  }

  @Get("/me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  me(@CurrentUser() user: { id: string }) {
    const result = this.authService.me(user.id);

    return result;
  }
}
