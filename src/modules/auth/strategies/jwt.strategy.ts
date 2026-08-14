import envConfig from "@/config/env.config";
import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(envConfig.KEY)
    config: ConfigType<typeof envConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.access_secret,
    });
  }

  validate(payload: { sub: string }) {
    return {
      id: payload.sub,
    };
  }
}
