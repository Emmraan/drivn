"use client";

import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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

const PrivacyPolicyPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-8"
          >
            <button
              onClick={() => router.push("/signup")}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2"
            >
              ← Back to Signup
            </button>
          </motion.div>

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Learn how we collect, use, and protect your personal information
            </p>
          </motion.div>

          {/* Content Container */}
          <div className="space-y-6">
            {content.map((item, i) => {
              const itemRef = useRef(null);
              const itemInView = useInView(itemRef, { once: true, margin: "-100px" });

              return (
                <motion.div
                  key={i}
                  ref={itemRef}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={itemInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.9 }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.05,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  className="glass glass-hover p-6 rounded-xl border border-glass-border-light dark:border-glass-border-dark"
                >
                  <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                    {item.title}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}

            {/* Last Updated */}
            <motion.div className="text-center pt-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last Updated: August 19, 2025
              </p>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
