import { TokenRepository } from "@/modules/auth/tokens/token.repository";
import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";

/**
 * Service managing opaque token generation, SHA-256 hashing, token verification, and token lifecycle events.
 */
@Injectable()
export class TokenService {
  constructor(private repository: TokenRepository) {}

  /**
   * Generates a 128-character opaque token, hashes it with SHA-256, and stores it in the database with an expiration time of 15 minutes.
   *
   * @param id - User primary key UUID.
   * @param type - Token purpose type (e.g. 'email_verification', 'password_reset').
   * @returns Raw unhashed opaque token string.
   */
  async generateVerificationToken(id: string, type: string) {
    const token = this.generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repository.insert(id, type, this.hashToken(token), expiresAt);

    return token;
  }

  /**
   * Upserts an active token record for a user by replacing/updating previous unused tokens of the given type.
   *
   * @param id - User primary key UUID.
   * @param type - Token purpose type.
   * @returns Newly generated raw opaque token string.
   */
  async resendVerificationToken(id: string, type: string) {
    const token = this.generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repository.upsert(id, type, this.hashToken(token), expiresAt);

    return token;
  }

  /**
   * Computes a SHA-256 hex digest for a raw token string.
   *
   * @param token - Raw token string.
   * @returns 64-character hex hash string.
   */
  hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generates a secure random 64-byte opaque token encoded as hex.
   *
   * @returns 128-character hex string.
   */
  generateOpaqueToken() {
    return randomBytes(64).toString("hex");
  }
}
