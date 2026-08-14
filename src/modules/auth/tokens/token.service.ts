import { TokenRepository } from "@/modules/auth/tokens/token.repository";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "crypto";

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private repository: TokenRepository,
  ) {}

  async generateAccessToken(payload: { sub: string }) {
    return await this.jwtService.signAsync(payload);
  }

  async generateRefreshToken(id: string) {
    const token = randomBytes(64).toString("hex");
    await this.repository.insert(id, this.hashRefreshToken(token));
    return token;
  }

  hashRefreshToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  async find(token: string) {
    const hashedToken = this.hashRefreshToken(token);
    return await this.repository.findToken(hashedToken);
  }

  async logout(token: string) {
    const hashedToken = this.hashRefreshToken(token);
    await this.repository.revokeToken(hashedToken);
  }
}
