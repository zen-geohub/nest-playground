import { DatabaseService } from "@/database/database.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TokenRepository {
  constructor(private db: DatabaseService) {}

  async insert(
    id: string,
    hashedToken: string,
    expiredAt: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  ) {
    await this.db.transaction(async (client) => {
      await client.query(
        `DELETE FROM user_sessions
        WHERE user_id = $1`,
        [id],
      );

      await client.query(
        `INSERT INTO user_sessions (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        `,
        [id, hashedToken, expiredAt],
      );
    });
  }

  async findToken(token: string): Promise<{
    user_id: string;
    expires_at: string;
    revoked_at: string | null;
  } | null> {
    const { rows } = await this.db.query<{
      user_id: string;
      expires_at: string;
      revoked_at: string | null;
    }>(
      `SELECT user_id, expires_at, revoked_at
      FROM user_sessions
      WHERE token = $1 AND revoked_at IS NULL`,
      [token],
    );

    return rows[0] ?? null;
  }

  async revokeToken(token: string) {
    await this.db.query(
      `UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE token = $1`,
      [token],
    );
  }

  async revokeAllSessions(userId: string) {
    await this.db.query(
      `UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }
}
