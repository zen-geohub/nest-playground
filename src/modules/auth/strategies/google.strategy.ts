import envConfig from "@/config/env.config";
import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type Profile } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(envConfig.KEY)
    config: ConfigType<typeof envConfig>,
  ) {
    super({
      clientID: config.google.id,
      clientSecret: config.google.secret,
      callbackURL: config.base_url + "/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): { provider: string; id: string; email?: string; name: string } {
    return {
      provider: "google",
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
    };
  }
}
