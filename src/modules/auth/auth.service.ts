import { hash, verify } from "@/utils/argon";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { AuthRepository } from "@/modules/auth/auth.repository";
import { CreateUserDto, LoginDto } from "@/modules/auth/dto";
import { TokenService } from "@/modules/auth/tokens/token.service";
import { SessionService } from "@/modules/auth/sessions/session.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly repository: AuthRepository,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async create(payload: CreateUserDto) {
    payload.password = await hash(payload.password);
    const id = await this.repository.insertUser(payload);
    const token = await this.tokenService.generateVerificationToken(id);

    return {
      token,
    };
  }

  async resendVerifEmail(email: string) {
    const record = await this.repository.findUserByEmail(email);

    if (!record) throw new BadRequestException("Email not found!");
    if (record.email_verified_at)
      throw new BadRequestException("Email already verified!");

    const token = await this.tokenService.resendVerificationToken(record.id);

    return {
      token,
    };
  }

  async login(payload: LoginDto) {
    const user = await this.repository.findUserByEmail(payload.email);
    if (!user) throw new NotFoundException("User not found!");

    const verified = await verify(user.password, payload.password);
    if (!verified) throw new UnauthorizedException("Invalid credentials!");

    const accessToken = await this.sessionService.generateAccessToken(user.id);
    const refreshToken = await this.sessionService.generateRefreshToken(
      user.id,
    );

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

    const accessToken = await this.sessionService.generateAccessToken(
      result.userId,
    );
    const refreshToken = await this.sessionService.generateRefreshToken(
      result.userId,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
