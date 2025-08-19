'use client'

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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
                <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

                {termsContent.map((item, i) => (
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

export default TermsPage;
