import { JwtModule } from "@nestjs/jwt";
import { Module } from "@nestjs/common";
import { AuthController } from "@/modules/auth/auth.controller";
import { AuthService } from "@/modules/auth/auth.service";
import { AuthRepository } from "@/modules/auth/auth.repository";
import envConfig from "@/config/env.config";
import { ConfigType } from "@nestjs/config";
import { JwtStrategy } from "@/modules/auth/strategies/jwt.strategy";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { GoogleAuthGuard } from "@/modules/auth/guards/google-auth.guard";
import { GoogleStrategy } from "@/modules/auth/strategies/google.strategy";
import { TokenService } from "@/modules/auth/tokens/token.service";
import { TokenRepository } from "@/modules/auth/tokens/token.repository";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [envConfig.KEY],
      useFactory: (config: ConfigType<typeof envConfig>) => ({
        secret: config.access_secret,
        signOptions: {
          expiresIn: "1h",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    TokenService,
    TokenRepository,
    JwtStrategy,
    JwtAuthGuard,
    GoogleAuthGuard,
    GoogleStrategy,
  ],
})
export class AuthModule {}
