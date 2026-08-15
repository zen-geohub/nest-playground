import { SessionRepository } from "@/modules/auth/sessions/session.repository";
import { TokenService } from "@/modules/auth/tokens/token.service";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class SessionService {
  constructor(
    private repository: SessionRepository,
    private jwtService: JwtService,
    private tokenService: TokenService,
  ) {}

  async generateAccessToken(id: string) {
    return await this.jwtService.signAsync({ sub: id });
  }

  async generateRefreshToken(id: string) {
    const token = this.tokenService.generateOpaqueToken();
    await this.repository.insert(id, this.tokenService.hashToken(token));
    return token;
  }

  async find(token: string) {
    const hashed = this.tokenService.hashToken(token);
    return await this.repository.findToken(hashed);
  }

  async logout(token: string) {
    const hashed = this.tokenService.hashToken(token);
    await this.repository.revokeTokenSession(hashed);
  }
}
