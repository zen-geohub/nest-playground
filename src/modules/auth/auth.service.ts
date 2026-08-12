import { AuthRepository } from "./auth.repository";
import type { CreateUserDto } from "./dto";
import { hash } from "../../utils/argon";
import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: PinoLogger,
    private repository: AuthRepository,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async create(payload: CreateUserDto) {
    payload.password = await hash(payload.password);
    const result = await this.repository.insertUser(payload);

    return result;
  }
}
