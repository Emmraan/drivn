'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface VerificationState {
  status: 'loading' | 'success' | 'error' | 'expired';
  message: string;
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationState, setVerificationState] = useState<VerificationState>({
    status: 'loading',
    message: 'Verifying your email...'
  });
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setVerificationState({
        status: 'error',
        message: 'Invalid verification link. Please check your email for the correct link.'
      });
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  useEffect(() => {
    if (verificationState.status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (verificationState.status === 'success' && countdown === 0) {
      router.push('/dashboard');
    }
  }, [verificationState.status, countdown, router]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (result.success) {
        setVerificationState({
          status: 'success',
          message: 'Email verified successfully! Welcome to DRIVN.'
        });
      } else {
        // Check if token is expired
        const isExpired = result.message.toLowerCase().includes('expired');
        setVerificationState({
          status: isExpired ? 'expired' : 'error',
          message: result.message
        });
      }
    } catch (error) {
      setVerificationState({
        status: 'error',
        message: 'An error occurred while verifying your email. Please try again.'
      });
    }
  };

  const handleResendVerification = async () => {
    const email = searchParams.get('email');
    if (!email) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (result.success) {
        setVerificationState({
          status: 'success',
          message: 'New verification email sent! Please check your inbox.'
        });
      } else {
        setVerificationState({
          status: 'error',
          message: result.message || 'Failed to resend verification email.'
        });
      }
    } catch (error) {
      setVerificationState({
        status: 'error',
        message: 'An error occurred while resending verification email.'
      });
    }
  };

  const getIcon = () => {
    switch (verificationState.status) {
      case 'loading':
        return <ArrowPathIcon className="w-16 h-16 text-primary-600 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="w-16 h-16 text-green-600" />;
      case 'error':
      case 'expired':
        return <XCircleIcon className="w-16 h-16 text-red-600" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (verificationState.status) {
      case 'loading':
        return 'Verifying Email...';
      case 'success':
        return 'Email Verified!';
      case 'expired':
        return 'Verification Link Expired';
      case 'error':
        return 'Verification Failed';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto backdrop-blur-xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            {getIcon()}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            {getTitle()}
          </motion.h1>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 dark:text-gray-400"
          >
            {verificationState.message}
          </motion.p>

          {/* Success countdown */}
          {verificationState.status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
            >
              <p className="text-green-800 dark:text-green-200 text-sm">
                Redirecting to dashboard in {countdown} seconds...
              </p>
            </motion.div>
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            {verificationState.status === 'success' && (
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            )}

            {verificationState.status === 'expired' && (
              <Button
                onClick={handleResendVerification}
                className="w-full"
              >
                Resend Verification Email
              </Button>
            )}

            {(verificationState.status === 'error' || verificationState.status === 'expired') && (
              <Button
                variant="outline"
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Back to Login
              </Button>
            )}
          </motion.div>
        </motion.div>
      </Card>
    </div>
  );
}
