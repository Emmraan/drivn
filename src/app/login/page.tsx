import type { Metadata } from "next";
import LoginPage from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In - DRIVN",
  description:
    "Sign in to your DRIVN account to access your secure cloud storage. Manage your files with complete privacy and control.",
  keywords: ["login", "sign in", "authenticate", "cloud storage", "dashboard"],
  robots: "noindex, nofollow",
  alternates: {
    canonical: "https://drivn-one.vercel.app/login",
  },
  openGraph: {
    title: "Sign In - DRIVN",
    description:
      "Sign in to your DRIVN account to access your secure cloud storage.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sign In - DRIVN",
    description:
      "Sign in to your DRIVN account to access your secure cloud storage.",
  },
};

export default function LoginWrapper() {
  return <LoginPage />;
}
