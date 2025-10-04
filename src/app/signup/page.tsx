import type { Metadata } from "next";
import SignupPage from "./SignupClient";

export const metadata: Metadata = {
  title: "Sign Up - DRIVN",
  description:
    "Create your free DRIVN account and start securely storing your files with complete control. S3-compatible cloud storage.",
  keywords: [
    "signup",
    "register",
    "create account",
    "cloud storage",
    "S3",
    "free",
  ],
  robots: "noindex, nofollow",
  alternates: {
    canonical: "https://drivn-one.vercel.app/signup",
  },
  openGraph: {
    title: "Sign Up - DRIVN",
    description:
      "Create your free DRIVN account and start securely storing your files.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sign Up - DRIVN",
    description:
      "Create your free DRIVN account and start securely storing your files.",
  },
};

export default function SignupWrapper() {
  return <SignupPage />;
}
