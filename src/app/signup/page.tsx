'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context/AuthContext';
import SignupForm from '@/auth/components/SignupForm';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { AuthPageTransition } from '@/components/ui/PageTransition';

export default function SignupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);

  useEffect(() => {
    if (!loading && user && user.emailVerified) {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, router]);

  const handleSignupSuccess = () => {
    setShowVerificationPopup(true);
  };

  const closeVerificationPopup = () => {
    setShowVerificationPopup(false);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <AuthPageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            DRIVN
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create your account to get started
          </p>
        </motion.div>

        {/* Signup Form */}
        <SignupForm onSuccess={handleSignupSuccess} />

        {/* Back to Home Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6"
        >
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            ← Back to Home
          </button>
        </motion.div>

        {/* Already have account link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-4"
        >
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Sign in
            </button>
          </span>
        </motion.div>
      </div>

      {/* Email Verification Popup */}
      {showVerificationPopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full glass"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Account Created Successfully!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                We've sent a verification link to your email address. Please check your inbox and click the link to verify your account before signing in.
              </p>
              <button
                onClick={closeVerificationPopup}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2 px-4 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
              >
                Continue to Sign In
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
    </AuthPageTransition>
  );
}
