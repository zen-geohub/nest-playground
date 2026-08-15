import { DatabaseService } from "@/database/database.service";
import { buildInsert } from "@/utils/db";
import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class TokenRepository {
  constructor(private readonly db: DatabaseService) {}

  async insert(
    user_id: string,
    type: string,
    token: string,
    expires_at: Date = new Date(Date.now() + 60 * 60 * 1000),
  ) {
    const { columns, placeholders, values } = buildInsert(
      { user_id, type, token, expires_at },
      new Set(["user_id", "type", "token", "expires_at"]),
    );

    await this.db.query(
      `INSERT INTO user_tokens (${columns})
      VALUES (${placeholders})`,
      values,
    );
  }

  async delete(user_id: string) {
    await this.db.query(
      `DELETE FROM user_tokens
      WHERE user_id = $1`,
      [user_id],
    );
  }

  async verify(token: string) {
    const { rows } = await this.db.query<{ user_id: string }>(
      `SELECT *
      FROM user_tokens
      WHERE token = $1
        AND type = $2
        AND used_at IS NULL
        AND expires_at > NOW()`,
      [token, "email_verification"],
    );

    const record = rows[0];

    if (!record) throw new BadRequestException("Invalid or expired token.");

    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE user_tokens
        SET used_at = NOW()
        WHERE user_id = $1`,
        [record.user_id],
      );

      await client.query(
        `UPDATE users
        SET email_verified_at = NOW()
        WHERE id = $1`,
        [record.user_id],
      );
    });
  }
}
