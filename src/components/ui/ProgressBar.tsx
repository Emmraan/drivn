'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'error' | 'warning';
  showPercentage?: boolean;
  className?: string;
  animated?: boolean;
  glassmorphism?: boolean;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantClasses = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
};

const backgroundClasses = {
  primary: 'bg-primary-100 dark:bg-primary-900/30',
  success: 'bg-green-100 dark:bg-green-900/30',
  error: 'bg-red-100 dark:bg-red-900/30',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30',
};

export default function ProgressBar({
  progress,
  size = 'md',
  variant = 'primary',
  showPercentage = false,
  className,
  animated = true,
  glassmorphism = false,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const containerClasses = cn(
    'relative w-full rounded-full overflow-hidden',
    sizeClasses[size],
    glassmorphism
      ? 'bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-700/30'
      : backgroundClasses[variant],
    className
  );

  const barClasses = cn(
    'h-full rounded-full transition-all duration-300 ease-out',
    glassmorphism
      ? 'bg-gradient-to-r from-primary-400/80 to-primary-600/80 backdrop-blur-sm'
      : variantClasses[variant]
  );

  return (
    <div className="space-y-1">
      <div className={containerClasses}>
        <motion.div
          className={barClasses}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{
            duration: animated ? 0.5 : 0,
            ease: 'easeOut',
            type: 'spring',
            stiffness: 80,
          }}
        />
        
        {/* Animated shimmer effect for glassmorphism */}
        {glassmorphism && clampedProgress > 0 && clampedProgress < 100 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              width: '30%',
            }}
          />
        )}
      </div>
      
      {showPercentage && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600 dark:text-gray-400">
            {clampedProgress.toFixed(0)}%
          </span>
          {clampedProgress === 100 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-green-600 dark:text-green-400 font-medium"
            >
              Complete
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
}

// Circular progress bar variant
interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'primary' | 'success' | 'error' | 'warning';
  showPercentage?: boolean;
  className?: string;
  glassmorphism?: boolean;
}

export function CircularProgress({
  progress,
  size = 40,
  strokeWidth = 3,
  variant = 'primary',
  showPercentage = false,
  className,
  glassmorphism = false,
}: CircularProgressProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const strokeColor = glassmorphism
    ? 'url(#glassmorphism-gradient)'
    : variant === 'primary'
    ? '#3B82F6'
    : variant === 'success'
    ? '#10B981'
    : variant === 'error'
    ? '#EF4444'
    : '#F59E0B';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {glassmorphism && (
          <defs>
            <linearGradient id="glassmorphism-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
              <stop offset="100%" stopColor="rgba(147, 51, 234, 0.8)" />
            </linearGradient>
          </defs>
        )}
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={glassmorphism ? 'rgba(255, 255, 255, 0.2)' : '#E5E7EB'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: 0.5,
            ease: 'easeOut',
            type: 'spring',
            stiffness: 80,
          }}
        />
      </svg>
      
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {clampedProgress.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
