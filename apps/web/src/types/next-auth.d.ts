import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tier: "FREE" | "PRO" | "AGENCY";
      onboardingCompleted: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tier: "FREE" | "PRO" | "AGENCY";
    onboardingCompleted: boolean;
  }
}
