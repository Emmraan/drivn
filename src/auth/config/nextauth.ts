import GoogleProvider from 'next-auth/providers/google';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';

export const authOptions: any = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      if (account?.provider === 'google') {
        try {
          await connectDB();
          
          const existingUser = await User.findOne({ email: user.email });
          
          if (existingUser) {
            if (!existingUser.googleId && account.providerAccountId) {
              existingUser.googleId = account.providerAccountId;
              existingUser.provider = 'google';
              existingUser.image = user.image;
              existingUser.emailVerified = new Date();
              await existingUser.save();
            }
          } else {
            await User.create({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: 'google',
              googleId: account.providerAccountId,
              emailVerified: new Date(),
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error during Google sign in:', error);
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user, account }: { token: any; user: any; account: any }) {
      if (account?.provider === 'google' && user) {
        await connectDB();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.userId = dbUser._id.toString();
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
