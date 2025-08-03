'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? '2.5rem' : '2rem'),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(baseClasses, variantClasses.text)}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : '100%',
            }}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.1,
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
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// Predefined skeleton components for common use cases
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass rounded-xl p-6 space-y-4', className)}>
      <Skeleton variant="rectangular" height="1.5rem" width="60%" />
      <Skeleton variant="text" lines={3} />
      <div className="flex space-x-2">
        <Skeleton variant="rectangular" height="2.5rem" width="5rem" />
        <Skeleton variant="rectangular" height="2.5rem" width="5rem" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn('glass rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`header-${index}`} variant="text" height="1rem" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height="1rem" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 glass rounded-lg">
          <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="60%" />
          </div>
          <Skeleton variant="rectangular" width="4rem" height="2rem" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div>
        <Skeleton variant="text" width="10rem" height="2.5rem" />
        <div className="mt-2">
          <Skeleton variant="text" width="20rem" height="1rem" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="glass rounded-xl p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Skeleton variant="circular" width="2rem" height="2rem" />
              </div>
              <div className="ml-4 w-0 flex-1 space-y-2">
                <Skeleton variant="text" width="60%" height="0.875rem" />
                <Skeleton variant="text" width="40%" height="1.5rem" />
                <Skeleton variant="text" width="50%" height="0.875rem" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <Skeleton variant="text" width="8rem" height="1.5rem" className="mb-6" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="glass rounded-xl p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Skeleton variant="rectangular" width="3rem" height="3rem" className="rounded-lg" />
                </div>
                <div className="ml-4 space-y-2">
                  <Skeleton variant="text" width="6rem" height="1.125rem" />
                  <Skeleton variant="text" width="8rem" height="0.875rem" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started Card */}
      <div className="glass rounded-xl p-8">
        <div className="text-center space-y-4">
          <Skeleton variant="circular" width="3rem" height="3rem" className="mx-auto" />
          <Skeleton variant="text" width="12rem" height="1.5rem" className="mx-auto" />
          <div className="max-w-2xl mx-auto space-y-2">
            <Skeleton variant="text" width="100%" height="1rem" />
            <Skeleton variant="text" width="80%" height="1rem" className="mx-auto" />
          </div>
          <Skeleton variant="rectangular" width="8rem" height="2.5rem" className="mx-auto" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonSettings({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Skeleton variant="circular" width="2rem" height="2rem" />
        <div className="space-y-2">
          <Skeleton variant="text" width="8rem" height="2rem" />
          <Skeleton variant="text" width="20rem" height="1rem" />
        </div>
      </div>

      {/* Configuration Form */}
      <div className="glass rounded-xl p-6 space-y-6">
        <Skeleton variant="text" width="10rem" height="1.5rem" />

        {/* Form Fields */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton variant="text" width="6rem" height="1rem" />
              <Skeleton variant="rectangular" height="3rem" />
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          <Skeleton variant="rectangular" width="6rem" height="2.5rem" />
          <Skeleton variant="rectangular" width="8rem" height="2.5rem" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
