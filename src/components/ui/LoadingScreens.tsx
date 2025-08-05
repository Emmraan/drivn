'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UserPlusIcon, ArrowRightOnRectangleIcon, CheckCircleIcon, ArrowUpTrayIcon, FolderIcon } from '@heroicons/react/24/outline';

interface LoadingScreenProps {
  message: string;
}

export function AccountCreationLoading({ message }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      {/* Animated Account Creation Icon */}
      <motion.div
        className="relative mb-8"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
          <UserPlusIcon className="w-12 h-12 text-white" />
        </div>
        
        {/* Orbiting dots */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: [0, -360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
            <div className="w-3 h-3 bg-primary-400 rounded-full"></div>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
            <div className="w-3 h-3 bg-secondary-400 rounded-full"></div>
          </div>
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2">
            <div className="w-3 h-3 bg-primary-300 rounded-full"></div>
          </div>
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2">
            <div className="w-3 h-3 bg-secondary-300 rounded-full"></div>
          </div>
        </motion.div>
      </motion.div>

      {/* Animated Text */}
      <motion.h3
        className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Creating Your Account
      </motion.h3>

      <motion.p
        className="text-gray-600 dark:text-gray-400 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        {[
          { label: 'Validating', delay: 0 },
          { label: 'Securing', delay: 0.5 },
          { label: 'Finalizing', delay: 1 }
        ].map((step) => (
          <motion.div
            key={step.label}
            className="flex items-center space-x-2"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              delay: step.delay 
            }}
          >
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function LoginLoading({ message }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      {/* Animated Login Icon */}
      <motion.div
        className="relative mb-8"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
          <ArrowRightOnRectangleIcon className="w-12 h-12 text-white" />
        </div>
        
        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-blue-300 dark:border-blue-600"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.7, 0.3, 0.7]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {/* Animated Text */}
      <motion.h3
        className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Signing You In
      </motion.h3>

      <motion.p
        className="text-gray-600 dark:text-gray-400 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>

      {/* Loading dots */}
      <div className="flex space-x-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-blue-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function UploadLoadingScreen({ message }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      {/* Animated Upload Icon */}
      <motion.div
        className="relative mb-8"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
          <ArrowUpTrayIcon className="w-12 h-12 text-white" />
        </div>

        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-blue-300"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 0.3, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {/* Animated Text */}
      <motion.h3
        className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Uploading Files
      </motion.h3>

      <motion.p
        className="text-gray-600 dark:text-gray-400 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>

      {/* Loading dots */}
      <div className="flex space-x-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-blue-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function FolderCreationLoadingScreen({ message }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      {/* Animated Folder Icon */}
      <motion.div
        className="relative mb-8"
      >
        <motion.div
          className="w-24 h-24 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center"
          animate={{
            y: [-2, 2, -2],
            rotate: [-1, 1, -1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <FolderIcon className="w-12 h-12 text-white" />
        </motion.div>

        {/* Sparkle effects */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            style={{
              top: `${10 + i * 20}%`,
              left: `${80 + (i % 2) * 10}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </motion.div>

      {/* Animated Text */}
      <motion.h3
        className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Creating Folder
      </motion.h3>

      <motion.p
        className="text-gray-600 dark:text-gray-400 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>

      {/* Loading dots */}
      <div className="flex space-x-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-yellow-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
