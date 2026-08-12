import { DatabaseService } from "../../database/database.service";
import { CreateUserDto } from "./dto";
import { CreateUserSchema } from "./schemas";
import { buildInsert } from "../../utils/db";
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";

@Injectable()
export class AuthRepository {
  constructor(private db: DatabaseService) {}

  async findUserByEmail(
    email: string,
  ): Promise<{ id: string; email: string; name: string }[]> {
    const { rows } = await this.db.query<{
      id: string;
      email: string;
      name: string;
    }>(
      `SELECT id, email, name
      FROM users
      WHERE LOWER(email) = LOWER($1)`,
      [email],
    );

    return rows;
  }

  async insertUser(payload: CreateUserDto) {
    const check = await this.findUserByEmail(payload.email);

    if (check.length > 0) {
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
}
