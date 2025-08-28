import GoogleProvider from "next-auth/providers/google";
import connectDB from "@/utils/database";
import User from "@/auth/models/User";
import { logger } from "@/utils/logger";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({
      user,
      account,
    }: {
      user: { email: string; name: string; image?: string };
      account: { provider: string; providerAccountId: string } | null;
    }) {
      if (account?.provider === "google") {
        try {
          await connectDB();

          const existingUser = await User.findOne({ email: user.email });

          if (existingUser) {
            if (
              existingUser.provider === "credentials" &&
              !existingUser.googleId
            ) {
              return "/login?error=OAuthAccountNotLinked";
            }

            if (!existingUser.googleId && account.providerAccountId) {
              existingUser.googleId = account.providerAccountId;
              existingUser.provider = "google";
              existingUser.image = user.image;
              existingUser.emailVerified = new Date();
              await existingUser.save();
            }
          } else {
            await User.create({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: "google",
              googleId: account.providerAccountId,
              emailVerified: new Date(),
            });
          }

          return true;
        } catch (error) {
          logger.error("Error during Google sign in:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({
      token,
      user,
      account,
    }: {
      token: { userId?: string; [key: string]: unknown };
      user?: { email: string };
      account?: { provider: string } | null;
    }) {
      if (account?.provider === "google" && user) {
        await connectDB();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.userId = dbUser._id.toString();
        }
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: { user?: { id?: string; [key: string]: unknown } };
      token: { userId?: string };
    }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
