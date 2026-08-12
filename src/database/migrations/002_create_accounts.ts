/* eslint-disable @typescript-eslint/require-await */
import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("accounts", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuidv7()"),
    },
    user_id: {
      type: "uuid",
      onDelete: "CASCADE",
      references: '"users"',
      notNull: true,
    },
    name: {
      type: "varchar(100)",
      notNull: true,
    },
    type: {
      type: "varchar(20)",
      notNull: true,
    },
    balance: {
      type: "bigint",
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
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("accounts");
}
