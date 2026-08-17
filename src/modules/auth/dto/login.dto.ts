import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    description: "User registered email address",
    example: "jane.doe@example.com",
  })
  email!: string;

  @ApiProperty({
    description: "User account password",
    example: "SecurePass123!",
  })
  password!: string;
}
