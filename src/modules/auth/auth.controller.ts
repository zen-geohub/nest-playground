import { ValidationPipe } from "../../core/pipes/validation.pipe";
import { AuthService } from "./auth.service";
import type { CreateUserDto } from "./dto";
import { CreateUserSchema } from "./schemas";
import { Body, Controller, HttpCode, Post, UsePipes } from "@nestjs/common";

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
}
