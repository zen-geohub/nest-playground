/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import * as fs from "fs";
import { PinoLogger } from "nestjs-pino";
import nodemailer from "nodemailer";
import { EmailService } from "./email.service";

jest.mock("fs");
jest.mock("nodemailer");

describe("EmailService", () => {
  let service: EmailService;
  let mockTransporter: { sendMail: jest.Mock };

  beforeEach(async () => {
    (fs.readFileSync as jest.Mock).mockReturnValue(
      Buffer.from("fake_logo_content"),
    );

    mockTransporter = {
      sendMail: jest.fn(),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const mockConfigService = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        const configMap: Record<string, string> = {
          "environment.google.user": "noreply@zen-auth.com",
          "environment.google.id": "client_id_123",
          "environment.google.secret": "client_secret_123",
          "environment.google.refresh_token": "refresh_token_123",
          "environment.app_url": "http://localhost:3000",
        };
        return configMap[key];
      }),
    };

    const mockLogger = {
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendVerificationEmail", () => {
    it("should construct verification URL and send email via nodemailer", async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: "msg_123" });

      const result = await service.sendVerificationEmail(
        "user@example.com",
        "token_123",
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Zen-Auth <noreply@zen-auth.com>",
          to: "user@example.com",
          subject: "Verify your email",
          html: expect.stringContaining(
            "http://localhost:3000/auth/verify-email?token=token_123",
          ),
          attachments: [
            expect.objectContaining({
              filename: "zen-logo.png",
              cid: "app-logo",
            }),
          ],
        }),
      );
      expect(result).toBe(true);
    });

    it("should log error and return false if transporter.sendMail fails", async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error("SMTP Connection Failed"),
      );

      const result = await service.sendVerificationEmail(
        "user@example.com",
        "token_123",
      );

      expect(result).toBe(false);
    });
  });
});
