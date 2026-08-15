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

  async generateVerificationToken(id: string) {
    const token = this.generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repository.insert(
      id,
      "email_verification",
      this.hashToken(token),
      expiresAt,
    );

    return token;
  }

  async resendVerificationToken(id: string) {
    await this.repository.delete(id);

    const token = await this.generateVerificationToken(id);

    return token;
  }

  async verifyToken(token: string) {
    const hashed = this.hashToken(token);
    await this.repository.verify(hashed);

    return {
      success: true,
      message: "Email verified.",
    };
  }

  hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  generateOpaqueToken() {
    return randomBytes(64).toString("hex");
  }
}
