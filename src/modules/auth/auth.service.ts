import { hash, verify } from "@/utils/argon";
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { AuthRepository } from "@/modules/auth/auth.repository";
import { CreateUserDto, LoginDto } from "@/modules/auth/dto";
import { TokenService } from "@/modules/auth/tokens/token.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: PinoLogger,
    private repository: AuthRepository,
    private tokenService: TokenService,
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

    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
    });

    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
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

    const accessToken = await this.tokenService.generateAccessToken({
      sub: result.userId,
    });
    const refreshToken = await this.tokenService.generateRefreshToken(
      result.userId,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async find(token: string) {
    return await this.tokenService.find(token);
  }
}
