import { registerAs } from "@nestjs/config";

export default registerAs("environment", () => ({
  access_secret: process.env.ACCESS_SECRET as string,
}));
