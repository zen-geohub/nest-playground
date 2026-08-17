import { DatabaseService } from "@/database/database.service";
import { CreateUserDto } from "@/modules/auth/dto";
import { CreateUserSchema } from "@/modules/auth/schemas";
import { TokenRepository } from "@/modules/auth/tokens/token.repository";
import { buildInsert } from "@/utils/db";
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";

/**
 * Database repository managing user persistence, credentials, password updates, and OAuth identity mappings.
 */
@Injectable()
export class AuthRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokenRepository: TokenRepository,
  ) {}

  /**
   * Queries a user record by email address (case-insensitive).
   *
   * @param email - Target email address to search.
   * @returns User persistence object or null if not found.
   */
  async findUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    name: string;
    email_verified_at: string;
  } | null> {
    const { rows } = await this.db.query<{
      id: string;
      email: string;
      password: string;
      name: string;
      email_verified_at: string;
    }>(
      `SELECT id, email, password, name, email_verified_at
      FROM users
      WHERE LOWER(email) = LOWER($1)`,
      [email],
    );

    return rows[0] ? rows[0] : null;
  }

  /**
   * Queries a user record by primary key UUID.
   *
   * @param id - User primary key UUID.
   * @returns User persistence object or null if not found.
   */
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

  /**
   * Inserts a new user record into the `users` table.
   *
   * @param payload - User creation details.
   * @returns Newly generated user UUID string.
   * @throws ConflictException if email address is already registered.
   * @throws HttpException if insertion fails to return an ID.
   */
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

    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO users (${columns})
      VALUES (${placeholders})
      RETURNING id;`,
      values,
    );

    if (!rows[0].id)
      throw new HttpException(
        "Internal server error.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    return rows[0].id;
  }

  /**
   * Finds an existing OAuth identity mapping or creates a new user and identity mapping in a transaction.
   *
   * @param payload - External identity payload containing provider, provider ID, email, and name.
   * @returns Object containing target user ID and boolean indicating if user is newly created.
   */
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

  /**
   * Verifies a password reset token and updates the target user's password inside a transaction.
   *
   * @param token - Hashed password reset token.
   * @param password - Newly hashed Argon2id password.
   * @returns Promise resolving to true if password was successfully updated.
   * @throws BadRequestException if the reset token is invalid or expired.
   */
  async updatePassword(token: string, password: string) {
    const record = await this.tokenRepository.findByToken(
      token,
      "password_reset",
    );
    if (!record) throw new BadRequestException("Invalid or expired token.");

    await this.db.transaction(async (client) => {
      await this.tokenRepository.verify(token);

      await client.query(
        `UPDATE users
        SET password = $1
        WHERE id = $2`,
        [password, record.user_id],
      );
    });

    return true;
  }

  /**
   * Helper method to query an external identity mapping by provider and provider user ID.
   *
   * @param provider - OAuth provider identifier (e.g. 'google').
   * @param providerUserId - Provider-specific unique user ID.
   * @returns Object with mapped user_id or null if not found.
   */
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
