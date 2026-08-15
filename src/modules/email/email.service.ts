import { verificationEmailTemplate } from "@/modules/email/templates/verification.template";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import path from "path";

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
}
