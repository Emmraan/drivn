'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import LoginForm from '@/auth/components/LoginForm';
import { useAuth } from '@/auth/context/AuthContext';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [verificationMessage, setVerificationMessage] = useState('');

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (!loading && user && user.emailVerified) {
      router.push('/dashboard');
      return;
    }

    // Handle verification message
    const message = searchParams.get('message');
    if (message === 'verify-email') {
      setVerificationMessage('Please verify your email address to access the dashboard. Check your inbox for the verification link.');
    }
  }, [user, loading, router, searchParams]);

  const handleLoginSuccess = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
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
      </div>
    </div>
  );
}
