import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/utils/theme/ThemeContext";
import { AuthProvider } from "@/auth/context/AuthContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DRIVN - Secure Open Source Cloud Storage",
  description: "Open-source, secure cloud storage that gives you complete control over your data. S3-compatible and privacy-first.",
  keywords: ["cloud storage", "open source", "S3 compatible", "secure", "privacy", "file storage"],
  authors: [{ name: "DRIVN Team" }],
  openGraph: {
    title: "DRIVN - Secure Open Source Cloud Storage",
    description: "Open-source, secure cloud storage that gives you complete control over your data.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DRIVN - Secure Open Source Cloud Storage",
    description: "Open-source, secure cloud storage that gives you complete control over your data.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
