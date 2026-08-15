import { registerAs } from "@nestjs/config";

export default registerAs("environment", () => ({
  app_url: process.env.APP_URL as string,
  base_url: process.env.BASE_URL as string,
  access_secret: process.env.ACCESS_SECRET as string,
  google: {
    id: process.env.GOOGLE_CLIENT_ID as string,
    secret: process.env.GOOGLE_CLIENT_SECRET as string,
    user: process.env.SMTP_USER as string,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN as string,
  },
}));
