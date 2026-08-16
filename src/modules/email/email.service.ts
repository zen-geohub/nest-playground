import { forgotPasswordEmailTemplate } from "@/modules/email/templates/forgot-password.template";
import { verificationEmailTemplate } from "@/modules/email/templates/verification.template";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import path from "path";

/**
 * Service responsible for configuring Nodemailer transport and dispatching
 * transactional email notifications (email verification, password reset, etc.).
 */
@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private readonly logo: Buffer;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: this.config.getOrThrow<string>("environment.google.user"),
        clientId: this.config.getOrThrow<string>("environment.google.id"),
        clientSecret: this.config.getOrThrow<string>(
          "environment.google.secret",
        ),
        refreshToken: this.config.getOrThrow<string>(
          "environment.google.refresh_token",
        ),
      },
    });

    this.logo = readFileSync(
      path.join(process.cwd(), "dist/assets/zen-logo.png"),
    );
  }

  /**
   * Sends a generic email using the configured Nodemailer OAuth2 transporter.
   *
   * @param options - Mail dispatch options containing recipient, subject, HTML body, and optional attachments.
   * @returns Promise resolving to Nodemailer SMTP transport info.
   */
  async send(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: Mail.Attachment[];
  }): Promise<SMTPTransport.SentMessageInfo> {
    return this.transporter.sendMail({
      from: `Zen-Auth <${this.config.getOrThrow<string>("environment.google.user")}>`,
      ...options,
    });
  }

  /**
   * Generates and dispatches an account verification email containing a verification URL.
   *
   * @param email - Recipient email address.
   * @param token - Raw email verification token string.
   * @returns Promise resolving to `true` if dispatched successfully, `false` otherwise.
   */
  async sendVerificationEmail(email: string, token: string) {
    try {
      const appUrl = this.config.getOrThrow<string>("environment.app_url");
      const verifUrl = `${appUrl}/auth/verify-email?token=${token}`;

      const html = verificationEmailTemplate({ verificationUrl: verifUrl });

      await this.send({
        to: email,
        subject: "Verify your email",
        html,
        attachments: [
          {
            filename: "zen-logo.png",
            content: this.logo,
            cid: "app-logo",
          },
        ],
      });
      return true;
    } catch (error) {
      this.logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          email,
        },
        "Failed to send verification email.",
      );
      return false;
    }
  }

  /**
   * Generates and dispatches a password reset email containing a reset password URL.
   *
   * @param email - Recipient email address.
   * @param token - Raw password reset token string.
   * @returns Promise resolving to `true` if dispatched successfully, `false` otherwise.
   */
  async sendForgotPasswordEmail(email: string, token: string) {
    try {
      const appUrl = this.config.getOrThrow<string>("environment.app_url");
      const url = `${appUrl}/auth/reset-password?token=${token}`;

      const html = forgotPasswordEmailTemplate({ resetPasswordUrl: url });

      await this.send({
        to: email,
        subject: "Password reset requested",
        html,
        attachments: [
          {
            filename: "zen-logo.png",
            content: this.logo,
            cid: "app-logo",
          },
        ],
      });
      return true;
    } catch (error) {
      this.logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          email,
        },
        "Failed to send forgot password email.",
      );
      return false;
    }
  }
}
