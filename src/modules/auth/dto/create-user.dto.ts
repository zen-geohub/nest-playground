import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({
    description: "User full name",
    example: "Jane Doe",
  })
  name!: string;

  @ApiProperty({
    description: "User primary email address",
    example: "jane.doe@example.com",
  })
  email!: string;

  @ApiProperty({
    description:
      "User password (minimum 8 characters, containing uppercase, lowercase, number, and special character)",
    example: "SecurePass123!",
  })
  password!: string;
}
