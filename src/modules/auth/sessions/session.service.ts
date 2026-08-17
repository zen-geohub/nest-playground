import { SessionRepository } from "@/modules/auth/sessions/session.repository";
import { TokenService } from "@/modules/auth/tokens/token.service";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

/**
 * Service managing user session token lifecycle including access token signing, refresh token rotation, session lookup, and logout.
 */
@Injectable()
export class SessionService {
  constructor(
    private repository: SessionRepository,
    private jwtService: JwtService,
    private tokenService: TokenService,
  ) {}

  /**
   * Signs a short-lived JWT access token containing the user ID subject (`sub`).
   *
   * @param id - User primary key UUID.
   * @returns Signed JWT access token string.
   */
  async generateAccessToken(id: string) {
    return await this.jwtService.signAsync({ sub: id });
  }

  /**
   * Generates a 128-character opaque refresh token, hashes it, stores the session in database, and returns the raw token.
   *
   * @param id - User primary key UUID.
   * @returns Raw opaque refresh token string.
   */
  async generateRefreshToken(id: string) {
    const token = this.tokenService.generateOpaqueToken();
    await this.repository.insert(id, this.tokenService.hashToken(token));
    return token;
  }

  /**
   * Hashes a raw refresh token and queries the active session record.
   *
   * @param token - Raw refresh token string.
   * @returns Active session record or null if not found/revoked.
   */
  async find(token: string) {
    const hashed = this.tokenService.hashToken(token);
    return await this.repository.findToken(hashed);
  }

  /**
   * Revokes a session by hashing the raw token and setting `revoked_at = NOW()`.
   *
   * @param token - Raw refresh token string to revoke.
   */
  async logout(token: string) {
    const hashed = this.tokenService.hashToken(token);
    await this.repository.revokeTokenSession(hashed);
  }
}
