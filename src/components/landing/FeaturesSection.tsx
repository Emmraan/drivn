'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import {
  ShieldCheckIcon,
  CloudArrowUpIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  LockClosedIcon,
  ServerIcon,
  CubeIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: ShieldCheckIcon,
    title: 'End-to-End Encryption',
    description: 'Your files are encrypted before they leave your device. Only you have the keys to decrypt your data.',
    color: 'text-green-500',
  },
  {
    icon: GlobeAltIcon,
    title: 'S3-Compatible API',
    description: 'Drop-in replacement for Amazon S3. Use existing tools and libraries without any changes.',
    color: 'text-blue-500',
  },
  {
    icon: CodeBracketIcon,
    title: '100% Open Source',
    description: 'Fully transparent codebase. Audit, contribute, and customize to your needs.',
    color: 'text-purple-500',
  },
  {
    icon: CloudArrowUpIcon,
    title: 'Unlimited Storage',
    description: 'Scale from gigabytes to petabytes. Pay only for what you use with transparent pricing.',
    color: 'text-indigo-500',
  },
  {
    icon: LockClosedIcon,
    title: 'Privacy First',
    description: 'Zero-knowledge architecture. We cannot access your files even if we wanted to.',
    color: 'text-red-500',
  },
  {
    icon: ServerIcon,
    title: 'Self-Hostable',
    description: 'Deploy on your own infrastructure for complete control and compliance.',
    color: 'text-orange-500',
  },
  {
    icon: CubeIcon,
    title: 'Version Control',
    description: 'Built-in versioning keeps your file history safe with intelligent deduplication.',
    color: 'text-teal-500',
  },
  {
    icon: BoltIcon,
    title: 'Lightning Fast',
    description: 'Global CDN and intelligent caching ensure your files load instantly anywhere.',
    color: 'text-yellow-500',
  },
];

export default function FeaturesSection() {
  return (
    <section id='features' className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose{' '}
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              DRIVN
            </span>
            ?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Built by developers, for developers. DRIVN combines the best of modern cloud storage 
            with the security and transparency you deserve.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card hover className="h-full text-center">
                <div className="flex flex-col items-center">
                  <div className={`p-3 rounded-xl bg-gray-100 dark:bg-gray-800 mb-4`}>
                    <feature.icon className={`w-8 h-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* S3 Compatibility Highlight */}
        <motion.div
          className="mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="text-center bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
            <div className="max-w-3xl mx-auto">
              <GlobeAltIcon className="w-16 h-16 text-primary-600 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Drop-in S3 Replacement
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                DRIVN is fully compatible with the Amazon S3 SDK. Use your existing S3 Provider, 
                Credientials without any changes.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full">Cloudflare R2</span>
                <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full">MinIO</span>
                <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full">DigitalOcean Spaces</span>
                <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full">Wasabi</span>
                <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full">Tebi</span>
                <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full">Backblaze</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
