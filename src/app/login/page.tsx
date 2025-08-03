'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import LoginForm from '@/auth/components/LoginForm';
import { useAuth } from '@/auth/context/AuthContext';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { AuthPageTransition } from '@/components/ui/PageTransition';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [verificationMessage, setVerificationMessage] = useState('');

  useEffect(() => {
    if (!loading && user && user.emailVerified) {
      router.push('/dashboard');
      return;
    }

    const message = searchParams.get('message');
    if (message === 'verify-email') {
      setVerificationMessage('Please verify your email address to access the dashboard. Check your inbox for the verification link.');
    }

    const error = searchParams.get('error');
    if (error === 'OAuthAccountNotLinked') {
      setVerificationMessage('An account with this email already exists. Please sign in with your email and password instead.');
    }
  }, [user, loading, router, searchParams]);

  const handleLoginSuccess = () => {
    // Use replace instead of push for immediate redirect without history
    router.replace('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <AuthPageTransition>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Verification Message */}
        {verificationMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          >
            <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
              {verificationMessage}
            </p>
          </motion.div>
        )}

        {/* Login Form */}
        <LoginForm onSuccess={handleLoginSuccess} />

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

        {/* Don't have account link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-4"
        >
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Sign up
            </button>
          </span>
        </motion.div>
      </div>
    </div>
    </AuthPageTransition>
  );
}
