import NextAuth from 'next-auth';
import { authOptions } from '@/auth/config/nextauth';

// @ts-ignore - NextAuth v4 typing issue
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
