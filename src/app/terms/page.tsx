"use client";

import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const termsContent = [
  {
    title: "1. Acceptance of Terms",
    description:
      "By creating an account, accessing, or using the Service, you signify your agreement to these Terms. If you do not agree to these Terms, you may not access or use the Service.",
  },
  {
    title: "2. Changes to Terms",
    description:
      "We reserve the right to modify or revise these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the 'Last Updated' date. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.",
  },
  {
    title: "3. Privacy Policy",
    description:
      "Your use of the Service is also governed by our Privacy Policy, which is incorporated herein by reference. Please review our Privacy Policy to understand our practices regarding your personal data.",
  },
  {
    title: "4. User Accounts",
    description:
      "To access certain features of the Service, you may be required to create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for any activities or actions under your account.",
  },
  {
      title: "5. Use of the Service",
      description:
          "You agree to use the Service only for lawful purposes and in accordance with these Terms. You are prohibited from using the Service to: Violate any applicable national or international law or regulation; Infringe upon or violate our intellectual property rights or the intellectual property rights of others; Transmit any unsolicited or unauthorized advertising or promotional material; Transmit any data that contains viruses or any other harmful programs.",
  },
  {
      title: "5.1. Data Storage Rights",
      description:
          "By using our Service, you grant us the right to use your configured S3-compatible storage bucket to store and manage user-related data, including but not limited to profile images, account settings, and other personal content you upload. We will only access and use this storage as necessary to provide the Service and maintain your account.",
  },
  {
    title: "6. Intellectual Property",
    description:
      "The Service and its original content, features, and functionality are and will remain the exclusive property of Drivn and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Drivn.",
  },
  {
    title: "7. Termination",
    description:
      "We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.",
  },
  {
    title: "8. Limitation of Liability",
    description:
      "In no event shall Drivn, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages...",
  },
  {
    title: "9. Governing Law",
    description:
      "These Terms shall be governed and construed in accordance with the laws of INDIA, without regard to its conflict of law provisions.",
  },
  {
    title: "10. Contact Us",
    description:
      "If you have any questions about these Terms, please contact us on Github.",
  },
];

const TermsPage = () => {
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
              Terms of Service
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Please read these terms carefully before using our service
            </p>
          </motion.div>

          {/* Content Container */}
          <div className="space-y-6">
            {termsContent.map((item, i) => {
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

export default TermsPage;
