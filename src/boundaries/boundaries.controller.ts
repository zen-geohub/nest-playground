import { Boundaries } from "@/boundaries/boundaries.interface";
import { BoundariesService } from "@/boundaries/boundaries.service";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from "@nestjs/common";

@Controller("boundaries")
export class BoundariesController {
  constructor(private boundariesService: BoundariesService) {}

  @Get()
  @HttpCode(200)
  async getFilters(
    @Query("id") id: string,
  ): Promise<Omit<Boundaries, "geom">[]> {
    if (!id) throw new BadRequestException("ID is required!");

    const result = await this.boundariesService.getAdminFilters(id);

    return result;
  }

  @Get("/mvt/:z/:x/:y")
  @HttpCode(200)
  getMVT(
    @Param("z") z: string,
    @Param("x") x: string,
    @Param("y") y: string,
  ): string {
    return `${z} ${x} ${y}`;
  }

  @Post()
  @HttpCode(201)
  postBoundary(@Body() payload: { id: string }) {
    return {
      message: "Hello world",
      ...payload,
    };
  }
}
