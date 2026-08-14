import { registerAs } from "@nestjs/config";

export default registerAs("environment", () => ({
  base_url: process.env.BASE_URL as string,
  access_secret: process.env.ACCESS_SECRET as string,
  google: {
    id: process.env.GOOGLE_CLIENT_ID as string,
    secret: process.env.GOOGLE_CLIENT_SECRET as string,
  },
}));
