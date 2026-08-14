/* eslint-disable @typescript-eslint/require-await */
import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuidv7()"),
    },
    email: {
      type: "varchar(255)",
      notNull: true,
      unique: true,
    },
    password: {
      type: "varchar(255)",
    },
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.createTable("auth_identities", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuidv7()"),
    },
    user_id: {
      type: "uuid",
      references: "users(id)",
      onDelete: "CASCADE",
      notNull: true,
    },
    provider: {
      type: "varchar(255)",
      notNull: true,
    },
    provider_user_id: {
      type: "varchar(255)",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.createTable("user_sessions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuidv7()"),
    },
    user_id: {
      type: "uuid",
      references: "users(id)",
      onDelete: "CASCADE",
      notNull: true,
    },
    token: {
      type: "text",
      notNull: true,
    },
    expires_at: {
      type: "timestamptz",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    revoked_at: {
      type: "timestamptz",
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("user_sessions");
  pgm.dropTable("auth_identities");
  pgm.dropTable("users");
}
