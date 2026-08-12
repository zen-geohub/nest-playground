import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
