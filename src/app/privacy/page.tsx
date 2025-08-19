'use client'

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const content = [
  {
    title: "1. Collection of Your Information",
    description: "We may collect information about you in a variety of ways. The information we may collect on the Site includes:"
  },
  {
    title: "Personal Data",
    description: "Personally identifiable information, such as your name, email address, phone number, and other similar information."
  },
  {
    title: "2. Use of Your Information",
    description: "Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience..."
  },
  {
    title: "3. Disclosure of Your Information",
    description: "We may share information we have collected about you in certain situations. Your information may be disclosed as follows:"
  },
  {
    title: "By Law or to Protect Rights",
    description: "If we believe the release of information about you is necessary to respond to legal process..."
  },
  {
    title: "4. Security of Your Information",
    description: "We use administrative, technical, and physical security measures to help protect your personal information."
  },
  {
    title: "5. Policy for Children",
    description: "We do not knowingly solicit information from or market to children under the age of 13."
  },
  {
    title: "6. Changes to This Privacy Policy",
    description: "We may update our Privacy Policy from time to time..."
  },
  {
    title: "7. Contact Us",
    description: "If you have any questions or comments about this Privacy Policy, please contact us on Github."
  }
];

const PrivacyPolicyPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col pt-20">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 px-8 sm:px-16"
      >
        <button
          onClick={() => router.push('/signup')}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          ← Back to Signup
        </button>
      </motion.div>

      <main className="flex-grow container mx-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        {/* Map through array with scroll animation */}
        {content.map((item, i) => (
          <div
            key={i}
            className="mb-4"
          >
            <h2 className="text-2xl font-semibold">{item.title}</h2>
            <p className="text-base mt-2">{item.description}</p>
          </div>
        ))}

        <p className="text-sm text-gray-500 mt-8">Last Updated: August 19, 2025</p>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
