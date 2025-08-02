'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/utils/theme/ThemeContext";
import { AuthProvider } from "@/auth/context/AuthContext";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
