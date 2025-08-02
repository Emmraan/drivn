'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: 'What makes DRIVN different from other cloud storage providers?',
    answer: 'DRIVN is built with privacy and developer experience as core principles. Unlike traditional providers, we offer end-to-end encryption, complete transparency through open source code, and S3-compatible APIs that work with your existing tools. You maintain complete control over your data with zero-knowledge architecture.',
  },
  {
    question: 'Is DRIVN really compatible with Amazon S3?',
    answer: 'Yes! DRIVN implements the full S3 API specification, meaning you can use existing tools like AWS CLI, Boto3, Terraform, and any S3-compatible application without any modifications. Simply change your endpoint URL and credentials.',
  },
  {
    question: 'How secure is my data with DRIVN?',
    answer: 'Your data is encrypted end-to-end using industry-standard AES-256 encryption before it leaves your device. We use a zero-knowledge architecture, meaning even DRIVN cannot access your files. All encryption keys are derived from your password and never stored on our servers.',
  },
  {
    question: 'Can I self-host DRIVN?',
    answer: 'Absolutely! DRIVN is 100% open source and designed to be self-hostable. You can deploy it on your own infrastructure using Docker, Kubernetes, or traditional server setups. We provide comprehensive documentation and support for self-hosting.',
  },
  {
    question: 'What are the pricing plans?',
    answer: 'DRIVN offers transparent, pay-as-you-use pricing with no hidden fees. We have a generous free tier for personal use, and competitive rates for businesses. Unlike other providers, we don\'t charge for API requests or data transfer between regions.',
  },
  {
    question: 'How does version control work?',
    answer: 'DRIVN automatically versions your files with intelligent deduplication to save space. You can access previous versions of any file, restore deleted files, and track changes over time. Version history is encrypted and stored securely.',
  },
  {
    question: 'Is there an API for developers?',
    answer: 'Yes! DRIVN provides both S3-compatible APIs and our own enhanced REST API with additional features. We offer SDKs for popular programming languages and comprehensive API documentation with examples.',
  },
  {
    question: 'What happens if I want to migrate away from DRIVN?',
    answer: 'We believe in no vendor lock-in. You can export all your data at any time using standard S3 tools or our migration utilities. Your data remains in standard formats, making it easy to move to any other S3-compatible service.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Everything you need to know about DRIVN
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Card hover={false} className="overflow-hidden">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-inset"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                      {faq.question}
                    </h3>
                    <motion.div
                      animate={{ rotate: openIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDownIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    </motion.div>
                  </div>
                </button>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6">
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Still have questions?
          </p>
          <button className="text-primary-600 hover:text-primary-500 font-medium">
            Contact our support team →
          </button>
        </motion.div>
      </div>
    </section>
  );
}
