'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context/AuthContext';
import SignupForm from '@/auth/components/SignupForm';
import { SignupFormSkeleton } from '@/components/ui/SkeletonLoader';
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-xl border border-white/20 dark:border-gray-700/50 animate-pulse">
            <SignupFormSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthPageTransition>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

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
