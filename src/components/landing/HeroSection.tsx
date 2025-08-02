'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import AuthModal from '@/auth/components/AuthModal';
import { CloudArrowUpIcon, ShieldCheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

export default function HeroSection() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 dark:bg-primary-900 rounded-full mix-blend-multiply filter blur-xl opacity-70"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-200 dark:bg-secondary-900 rounded-full mix-blend-multiply filter blur-xl opacity-70"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center px-4 py-2 rounded-full glass mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              🚀 100% Open Source • S3-Compatible
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Your Files,{' '}
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Your Control
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            DRIVN is the open-source, secure cloud storage platform that gives you complete control over your data. 
            S3-compatible, privacy-first, and built for the modern web.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            className="flex flex-wrap justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center px-4 py-2 rounded-full glass">
              <ShieldCheckIcon className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm font-medium">End-to-End Encrypted</span>
            </div>
            <div className="flex items-center px-4 py-2 rounded-full glass">
              <GlobeAltIcon className="w-5 h-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium">S3-Compatible API</span>
            </div>
            <div className="flex items-center px-4 py-2 rounded-full glass">
              <CloudArrowUpIcon className="w-5 h-5 text-purple-500 mr-2" />
              <span className="text-sm font-medium">Unlimited Storage</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              size="xl"
              onClick={() => openAuthModal('signup')}
              className="w-full sm:w-auto"
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={() => openAuthModal('login')}
              className="w-full sm:w-auto"
            >
              Sign In
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            className="mt-12 text-sm text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p>Trusted by developers worldwide • No credit card required</p>
          </motion.div>
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          className="absolute top-20 left-10 w-20 h-20 glass rounded-2xl flex items-center justify-center"
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <CloudArrowUpIcon className="w-8 h-8 text-primary-500" />
        </motion.div>

        <motion.div
          className="absolute top-40 right-20 w-16 h-16 glass rounded-xl flex items-center justify-center"
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        >
          <ShieldCheckIcon className="w-6 h-6 text-green-500" />
        </motion.div>

        <motion.div
          className="absolute bottom-40 left-20 w-24 h-24 glass rounded-3xl flex items-center justify-center"
          animate={{ y: [-15, 15, -15] }}
          transition={{ duration: 5, repeat: Infinity, delay: 2 }}
        >
          <GlobeAltIcon className="w-10 h-10 text-blue-500" />
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </section>
  );
}
