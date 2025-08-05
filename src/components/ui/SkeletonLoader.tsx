'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ 
  className, 
  variant = 'rectangular', 
  width, 
  height, 
  lines = 1 
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const style = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '2rem'),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(baseClasses, variantClasses[variant])}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : '100%',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

// Pre-built skeleton components for common use cases
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-6 space-y-4', className)}>
      <div className="flex items-center space-x-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="text" lines={3} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width={colIndex === 0 ? '25%' : colIndex === columns - 1 ? '15%' : '20%'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height="2rem" />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="50%" />
      </div>
    </div>
  );
}

export function FileItemSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center p-3 space-x-3">
        <Skeleton variant="circular" width={24} height={24} />
        <div className="flex-1 space-y-1">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
        <Skeleton variant="circular" width={16} height={16} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 text-center">
      <Skeleton variant="circular" width={32} height={32} className="mx-auto" />
      <div className="space-y-1">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" width="30%" height="2rem" />
        <Skeleton variant="text" width="50%" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <StatCardSkeleton />
          </div>
        ))}
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <CardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoginFormSkeleton() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <Skeleton variant="text" width="60%" height="2.5rem" className="mx-auto" />
        <Skeleton variant="text" width="80%" height="1.25rem" className="mx-auto" />
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Email Field */}
        <div className="space-y-2">
          <Skeleton variant="text" width="20%" height="1rem" />
          <Skeleton variant="rounded" height="3rem" />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Skeleton variant="text" width="25%" height="1rem" />
          <Skeleton variant="rounded" height="3rem" />
        </div>

        {/* Submit Button */}
        <Skeleton variant="rounded" height="3rem" />

        {/* Divider */}
        <div className="relative py-4">
          <Skeleton variant="text" width="40%" height="1rem" className="mx-auto" />
        </div>

        {/* Google Button */}
        <Skeleton variant="rounded" height="3rem" />
      </div>

      {/* Footer */}
      <div className="text-center">
        <Skeleton variant="text" width="70%" height="1rem" className="mx-auto" />
      </div>
    </div>
  );
}

export function SignupFormSkeleton() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <Skeleton variant="text" width="50%" height="2.5rem" className="mx-auto" />
        <Skeleton variant="text" width="85%" height="1.25rem" className="mx-auto" />
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <Skeleton variant="text" width="25%" height="1rem" />
          <Skeleton variant="rounded" height="3rem" />
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Skeleton variant="text" width="20%" height="1rem" />
          <Skeleton variant="rounded" height="3rem" />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Skeleton variant="text" width="25%" height="1rem" />
          <Skeleton variant="rounded" height="3rem" />
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Skeleton variant="text" width="35%" height="1rem" />
          <Skeleton variant="rounded" height="3rem" />
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start space-x-3">
          <Skeleton variant="rounded" width="1.25rem" height="1.25rem" />
          <Skeleton variant="text" width="90%" height="1rem" />
        </div>

        {/* Submit Button */}
        <Skeleton variant="rounded" height="3rem" />

        {/* Divider */}
        <div className="relative py-4">
          <Skeleton variant="text" width="40%" height="1rem" className="mx-auto" />
        </div>

        {/* Google Button */}
        <Skeleton variant="rounded" height="3rem" />
      </div>

      {/* Footer */}
      <div className="text-center">
        <Skeleton variant="text" width="65%" height="1rem" className="mx-auto" />
      </div>
    </div>
  );
}
