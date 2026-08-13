import { hash, verify } from "@/utils/argon";
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { JwtService } from "@nestjs/jwt";
import { AuthRepository } from "@/modules/auth/auth.repository";
import { CreateUserDto, LoginDto } from "@/modules/auth/dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: PinoLogger,
    private repository: AuthRepository,
    private jwtService: JwtService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async create(payload: CreateUserDto) {
    payload.password = await hash(payload.password);
    const result = await this.repository.insertUser(payload);

    return result;
  }

  async login(payload: LoginDto) {
    const user = await this.repository.findUserByEmail(payload.email);

    if (!user) throw new NotFoundException("User not found!");

    const verified = await verify(user.password, payload.password);

    if (!verified) throw new UnauthorizedException("Invalid credentials!");

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
    });

    return {
      access_token: accessToken,
    };
  }

  async me(id: string) {
    const user = await this.repository.findUserById(id);

    if (!user) throw new NotFoundException("User not found!");

    const { id: ID, email, name } = user;

    return {
      id: ID,
      email,
      name,
    };
  }

  async findOrCreateIdentity(payload: {
    provider: string;
    id: string;
    email: string;
    name: string;
  }) {
    const result = await this.repository.findOrCreateIdentity(payload);

    const accessToken = await this.jwtService.signAsync({
      sub: result.userId,
    });

    return {
      access_token: accessToken,
    };
  }
}
