import { DatabaseService } from "@/database/database.service";
import { buildInsert } from "@/utils/db";
import { Injectable } from "@nestjs/common";

/**
 * Database repository managing user verification & password reset tokens in the `user_tokens` table.
 */
@Injectable()
export class TokenRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Queries an active, unused, unexpired token record by token hash and type.
   *
   * @param token - SHA-256 token hash.
   * @param type - Expected token purpose type.
   * @returns Token record or null if not found.
   */
  async findByToken(token: string, type: string) {
    const { rows } = await this.db.query<{
      id: string;
      user_id: string;
      type: string;
      token: string;
      expires_at: string;
      used_at: string;
    }>(
      `SELECT *
      FROM user_tokens
      WHERE token = $1
        AND type = $2
        AND used_at IS NULL
        AND expires_at > NOW()`,
      [token, type],
    );

    return rows[0] ?? null;
  }

  /**
   * Inserts a new token record into `user_tokens`.
   *
   * @param id - User primary key UUID.
   * @param type - Token purpose type.
   * @param token - Hashed token string.
   * @param expiresAt - Token expiration Date object.
   */
  async insert(
    id: string,
    type: string,
    token: string,
    expiresAt: Date = new Date(Date.now() + 60 * 60 * 1000),
  ) {
    const { columns, placeholders, values } = buildInsert(
      { id, type, token, expiresAt },
      new Set(["user_id", "type", "token", "expires_at"]),
    );

    await this.db.query(
      `INSERT INTO user_tokens (${columns})
      VALUES (${placeholders})`,
      values,
    );
  }

  /**
   * Inserts or updates a token record for a given user_id and type on conflict.
   *
   * @param id - User primary key UUID.
   * @param type - Token purpose type.
   * @param token - Hashed token string.
   * @param expiresAt - Token expiration Date object.
   */
  async upsert(
    id: string,
    type: string,
    token: string,
    expiresAt: Date = new Date(Date.now() + 60 * 60 * 1000),
  ) {
    const { columns, placeholders, values } = buildInsert(
      { id, type, token, expiresAt },
      new Set(["user_id", "type", "token", "expires_at"]),
    );

    await this.db.query(
      `INSERT INTO user_tokens (${columns})
      VALUES (${placeholders})
      ON CONFLICT (user_id, type)
      DO UPDATE SET
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at`,
      values,
    );
  }

  /**
   * Deletes all token records for a given user_id.
   *
   * @param id - User primary key UUID.
   */
  async delete(id: string) {
    await this.db.query(
      `DELETE FROM user_tokens
      WHERE user_id = $1`,
      [id],
    );
  }

  /**
   * Marks a token record as used by setting `used_at = NOW()`.
   *
   * @param token - SHA-256 token hash.
   */
  async verify(token: string) {
    await this.db.query(
      `UPDATE user_tokens
      SET used_at = NOW()
      WHERE token = $1`,
      [token],
    );
  }
}
