import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("transactions", {
    id: {
      type: "uuid",
      primaryKey: true,
    },
    account_id: {
      type: "uuid",
      references: '"accounts"',
      onDelete: "RESTRICT",
      notNull: true,
    },
    user_id: {
      type: "uuid",
      references: '"users"',
      onDelete: "RESTRICT",
      notNull: true,
    },
    type: {
      type: "varchar(10)",
      notNull: true,
    },
    amount: {
      type: "bigint",
      notNull: true,
    },
    description: {
      type: "varchar(255)",
    },
    transaction_date: {
      type: "timestamptz",
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
  pgm.dropTable("transactions");
}
