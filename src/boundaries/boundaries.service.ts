import { Boundaries } from "@/boundaries/boundaries.interface";
import { BoundariesRepository } from "@/boundaries/boundaries.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BoundariesService {
  private readonly boundaries: Boundaries[] = [];

  constructor(private repository: BoundariesRepository) {}

  async getAdminFilters(id: string): Promise<Omit<Boundaries, "geom">[]> {
    const result = await this.repository.findFilters(id);

    return result;
  }
}
