import { DatabaseService } from "@/database/database.service";
import { Injectable } from "@nestjs/common";

/**
 * Database repository managing active user refresh token sessions in the `user_sessions` table.
 */
@Injectable()
export class SessionRepository {
  constructor(private db: DatabaseService) {}

  /**
   * Deletes existing sessions for the user and inserts a new active session inside a database transaction.
   *
   * @param id - User primary key UUID.
   * @param hashedToken - SHA-256 hashed refresh token string.
   * @param expiredAt - Expiration Date object (defaults to 7 days from now).
   */
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

  /**
   * Queries an active unrevoked session record by hashed token.
   *
   * @param token - SHA-256 hashed refresh token string.
   * @returns Session record or null if not found or revoked.
   */
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

  /**
   * Revokes a token session by setting `revoked_at = NOW()`.
   *
   * @param token - SHA-256 hashed refresh token string.
   */
  async revokeTokenSession(token: string) {
    await this.db.query(
      `UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE token = $1`,
      [token],
    );
  }
}
