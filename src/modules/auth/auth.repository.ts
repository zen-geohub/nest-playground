import { DatabaseService } from "@/database/database.service";
import { CreateUserDto } from "@/modules/auth/dto";
import { CreateUserSchema } from "@/modules/auth/schemas";
import { buildInsert } from "@/utils/db";
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";

@Injectable()
export class AuthRepository {
  constructor(private db: DatabaseService) {}

  async findUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    name: string;
  } | null> {
    const { rows } = await this.db.query<{
      id: string;
      email: string;
      password: string;
      name: string;
    }>(
      `SELECT id, email, password, name
      FROM users
      WHERE LOWER(email) = LOWER($1)`,
      [email],
    );

    return rows[0] ? rows[0] : null;
  }

  async findUserById(id: string): Promise<{
    id: string;
    email: string;
    password: string;
    name: string;
  } | null> {
    const { rows } = await this.db.query<{
      id: string;
      email: string;
      password: string;
      name: string;
    }>(
      `SELECT id, email, password, name
      FROM users
      WHERE id = $1`,
      [id],
    );

    return rows[0] ? rows[0] : null;
  }

  async insertUser(payload: CreateUserDto) {
    const check = await this.findUserByEmail(payload.email);

    if (check) {
      throw new ConflictException("Email already exists!");
    }

    const schemaKeys = (CreateUserSchema.describe().keys || {}) as Record<
      string,
      unknown
    >;
    const { columns, values, placeholders } = buildInsert(
      payload,
      new Set(Object.keys(schemaKeys)),
    );

    const { rowCount } = await this.db.query(
      `INSERT INTO users (${columns})
      VALUES (${placeholders})
      `,
      values,
    );

    if (rowCount === 0)
      throw new HttpException(
        "Internal server error.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    return {
      success: true,
      message: "Successfully register new account.",
    };
  }

  async findOrCreateIdentity({
    provider,
    id,
    email,
    name,
  }: {
    provider: string;
    id: string;
    email: string;
    name: string;
  }) {
    const existingIdentity = await this.findIdentity(provider, id);

    if (existingIdentity) {
      return { userId: existingIdentity.userId, isNewUser: false };
    }

    const existingUser = await this.findUserByEmail(email);

    if (existingUser) {
      await this.db.query(
        `INSERT INTO auth_identities (user_id, provider, provider_user_id)
        VALUES ($1, $2, $3)`,
        [existingUser.id, provider, id],
      );

      return { userId: existingUser.id, isNewUser: false };
    }

    return this.db.transaction(async (client) => {
      console.log("transaction", email);
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO users (email, name)
        VALUES ($1, $2)
        ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
        RETURNING id`,
        [email, name],
      );

      const userId = rows[0].id;

      await client.query(
        `INSERT INTO auth_identities (user_id, provider, provider_user_id)
        VALUES ($1, $2, $3)`,
        [userId, provider, id],
      );

      return { userId, isNewUser: true };
    });
  }

  private async findIdentity(provider: string, providerUserId: string) {
    const { rows } = await this.db.query<{ user_id: string }>(
      `
      SELECT user_id
      FROM auth_identities
      WHERE provider = $1 AND provider_user_id = $2`,
      [provider, providerUserId],
    );

    return rows[0] ? { userId: rows[0].user_id } : null;
  }
}
