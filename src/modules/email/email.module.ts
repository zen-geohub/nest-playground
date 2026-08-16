import { EmailService } from "@/modules/email/email.service";
import { Module } from "@nestjs/common";

/**
 * Module providing email capabilities across the application.
 */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
