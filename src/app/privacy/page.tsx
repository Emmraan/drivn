import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy - DRIVN",
  description:
    "Learn how DRIVN collects, uses, and protects your personal information. Our privacy-first approach ensures your data stays secure and private.",
  keywords: [
    "privacy policy",
    "data protection",
    "privacy",
    "GDPR",
    "data security",
  ],
  alternates: {
    canonical: "https://drivn-one.vercel.app/privacy",
  },
  openGraph: {
    title: "Privacy Policy - DRIVN",
    description:
      "Learn how DRIVN collects, uses, and protects your personal information.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy - DRIVN",
    description:
      "Learn how DRIVN collects, uses, and protects your personal information.",
  },
};

const content = [
  {
    title: "1. Collection of Your Information",
    description:
      "We may collect information about you in a variety of ways. The information we may collect on the Site includes:",
  },
  {
    title: "2. Personal Data",
    description:
      "Personally identifiable information, such as your name, email address, phone number, and other similar information.",
  },
  {
    title: "3. Use of Your Information",
    description:
      "Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience...",
  },
  {
    title: "4. Disclosure of Your Information",
    description:
      "We may share information we have collected about you in certain situations. Your information may be disclosed as follows:",
  },
  {
    title: "5. By Law or to Protect Rights",
    description:
      "If we believe the release of information about you is necessary to respond to legal process...",
  },
  {
    title: "6. Security of Your Information",
    description:
      "We use administrative, technical, and physical security measures to help protect your personal information.",
  },
  {
    title: "7. Policy for Children",
    description:
      "We do not knowingly solicit information from or market to children under the age of 13.",
  },
  {
    title: "8. Changes to This Privacy Policy",
    description: "We may update our Privacy Policy from time to time...",
  },
  {
    title: "9. Contact Us",
    description:
      "If you have any questions or comments about this Privacy Policy, please contact us on Github.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-8">
            <Link
              href="/signup"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2"
            >
              ← Back to Signup
            </Link>
          </div>

          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Learn how we collect, use, and protect your personal information
            </p>
          </div>

          {/* Content Container */}
          <div className="space-y-6">
            {content.map((item, i) => {
              return (
                <div
                  key={i}
                  className="glass glass-hover p-6 rounded-xl border border-glass-border-light dark:border-glass-border-dark"
                >
                  <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                    {item.title}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}

            {/* Last Updated */}
            <div className="text-center pt-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last Updated: August 19, 2025
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
