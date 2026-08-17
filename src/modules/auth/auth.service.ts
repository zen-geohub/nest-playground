import { hash, verify } from "@/utils/argon";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { AuthRepository } from "@/modules/auth/auth.repository";
import { CreateUserDto, LoginDto } from "@/modules/auth/dto";
import { TokenService } from "@/modules/auth/tokens/token.service";
import { SessionService } from "@/modules/auth/sessions/session.service";
import { ConfigService } from "@nestjs/config";

/**
 * Service encapsulating core authentication logic, credential hashing, user onboarding,
 * password resets, and OAuth identity orchestration.
 */
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

  /**
   * Hashes the raw user password, inserts the new user record into the database, and issues an email verification token.
   *
   * @param payload - Registration payload containing user credentials.
   * @returns Object containing the email verification token.
   * @throws ConflictException if the email is already registered.
   */
  async create(payload: CreateUserDto) {
    payload.password = await hash(payload.password);
    const id = await this.repository.insertUser(payload);
    const token = await this.tokenService.generateVerificationToken(
      id,
      "email_verification",
    );

    return {
      token,
    };
  }

  /**
   * Resends an email verification token to an unverified user.
   *
   * @param email - Target user email address.
   * @returns Object containing the newly generated verification token.
   * @throws BadRequestException if the user does not exist or has already verified their email.
   */
  async resendVerifEmail(email: string) {
    const record = await this.repository.findUserByEmail(email);

    if (!record) throw new BadRequestException("Email not found!");
    if (record.email_verified_at)
      throw new BadRequestException("Email already verified!");

    const token = await this.tokenService.resendVerificationToken(
      record.id,
      "email_verification",
    );

    return {
      token,
    };
  }

  /**
   * Generates a password reset token for a registered user.
   *
   * @param email - Target user email address.
   * @returns Object containing the generated password reset token.
   * @throws BadRequestException if the email is not registered.
   */
  async forgotPasswordEmail(email: string) {
    const record = await this.repository.findUserByEmail(email);
    if (!record) throw new BadRequestException("Email not found!");

    const token = await this.tokenService.resendVerificationToken(
      record.id,
      "password_reset",
    );

    return {
      token,
    };
  }

  /**
   * Hashes a new password and updates the user record corresponding to a valid reset token.
   *
   * @param token - Raw password reset token.
   * @param password - Plaintext new password to set.
   * @returns Object with success message.
   * @throws InternalServerErrorException if update fails or token is invalid.
   */
  async updateNewPassword(token: string, password: string) {
    const hashToken = this.tokenService.hashToken(token);
    const hashPassword = await hash(password);

    const result = await this.repository.updatePassword(
      hashToken,
      hashPassword,
    );
    if (!result)
      throw new InternalServerErrorException("Internal server error.");

    return {
      success: true,
      message: "Password successfully changed.",
    };
  }

  /**
   * Validates user credentials using Argon2id and generates JWT access and refresh token sessions.
   *
   * @param payload - User login DTO (email, password).
   * @returns Object containing access_token and refresh_token strings.
   * @throws NotFoundException if user is not found.
   * @throws UnauthorizedException if password verification fails.
   */
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

  /**
   * Fetches user profile information by user ID.
   *
   * @param id - Internal user UUID.
   * @returns Profile details (id, email, name).
   * @throws NotFoundException if user is not found.
   */
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

  /**
   * Resolves or links an external OAuth identity (e.g. Google) to a user account and generates active token sessions.
   *
   * @param payload - OAuth identity payload (provider, id, email, name).
   * @returns Object containing access_token and refresh_token strings.
   */
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
