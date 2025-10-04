import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DRIVN - Secure Open Source Cloud Storage",
  description:
    "Open-source, secure cloud storage that gives you complete control over your data. S3-compatible and privacy-first.",
  keywords: [
    "cloud storage",
    "open source",
    "S3 compatible",
    "secure",
    "privacy",
    "file storage",
  ],
  authors: [{ name: "DRIVN Team" }],
  openGraph: {
    title: "DRIVN - Secure Open Source Cloud Storage",
    description:
      "Open-source, secure cloud storage that gives you complete control over your data.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DRIVN - Secure Open Source Cloud Storage",
    description:
      "Open-source, secure cloud storage that gives you complete control over your data.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Drivn" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "DRIVN",
              url: "https://drivn-one.vercel.app",
              logo: "https://drivn-one.vercel.app/icon1.png",
              description:
                "Open-source, secure cloud storage that gives you complete control over your data. S3-compatible and privacy-first.",
              foundingDate: "2024",
              sameAs: ["https://github.com/Emmraan/drivn"],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "DRIVN",
              description:
                "Secure, open-source cloud storage with S3 compatibility",
              url: "https://drivn-one.vercel.app",
              applicationCategory: "CloudStorage",
              operatingSystem: "Web",
              author: {
                "@type": "Organization",
                name: "DRIVN Team",
              },
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
