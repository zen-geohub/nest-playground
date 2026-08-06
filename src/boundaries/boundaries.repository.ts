import { Boundaries } from "./boundaries.interface";
import { DatabaseService } from "../database/database.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BoundariesRepository {
  private readonly ADMIN_LEVELS: Record<number, string> = {
    0: "mv_admin_province",
    1: "mv_admin_city",
    2: "mv_admin_city",
    4: "mv_admin_district",
    6: "mv_admin_village",
    10: "mv_admin_neighborhood",
    13: "mv_admin_community",
  };

  constructor(private db: DatabaseService) {}

  async findFilters(id: string): Promise<Omit<Boundaries, "geom">[]> {
    const table = this.getAdminTable(id.length);

    const { rows } = await this.db.query<Omit<Boundaries, "geom">>(
      `SELECT
          id, name
        FROM ${table}
        WHERE id LIKE $1
        ORDER BY name  
      `,
      [`${id}%`],
    );

    return rows;
  }

  private getAdminTable(idLength: number): string {
    const config = this.ADMIN_LEVELS[idLength];

    if (!config) {
      throw new Error("Invalid parameters!");
    }

    return config;
  }
}
