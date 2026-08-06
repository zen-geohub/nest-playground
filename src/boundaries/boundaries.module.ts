import { BoundariesController } from "@/boundaries/boundaries.controller";
import { BoundariesService } from "@/boundaries/boundaries.service";
import { Module } from "@nestjs/common";
import { BoundariesRepository } from "./boundaries.repository";

@Module({
  imports: [],
  controllers: [BoundariesController],
  providers: [BoundariesService, BoundariesRepository],
})
export class BoundariesModule {}
