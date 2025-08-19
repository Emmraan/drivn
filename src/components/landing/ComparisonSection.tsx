"use client";

import React from "react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

const features = [
  "End-to-End Encryption",
  "Open Source",
  "S3-Compatible SDK",
  "Self-Hostable",
  "Zero-Knowledge Architecture",
  "No Vendor Lock-in",
  "Built-in Version Control",
  "Global CDN",
  "Developer-First Design",
];

const providers = [
  {
    name: "DRIVN",
    logo: "🚀",
    features: [true, true, true, true, true, true, true, true, true, true],
    highlight: true,
  },
  {
    name: "AWS S3",
    logo: "☁️",
    features: [
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
    ],
    highlight: false,
  },
  {
    name: "Google Drive",
    logo: "📁",
    features: [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
    ],
    highlight: false,
  },
  {
    name: "Dropbox",
    logo: "📦",
    features: [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      false,
    ],
    highlight: false,
  },
];

export default function ComparisonSection() {
  return (
    <section className="py-24 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How DRIVN{" "}
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Compares
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            See why developers and businesses choose DRIVN over traditional
            cloud storage providers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Features
                    </th>
                    {providers.map((provider) => (
                      <th
                        key={provider.name}
                        className={`text-center py-4 px-6 font-semibold ${
                          provider.highlight
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-2xl mb-1">{provider.logo}</span>
                          <span className="text-sm">{provider.name}</span>
                          {provider.highlight && (
                            <span className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-full mt-1">
                              Recommended
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, featureIndex) => (
                    <motion.tr
                      key={feature}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: featureIndex * 0.05 }}
                    >
                      <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                        {feature}
                      </td>
                      {providers.map((provider) => (
                        <td
                          key={provider.name}
                          className="py-4 px-6 text-center"
                        >
                          {provider.features[featureIndex] ? (
                            <CheckIcon
                              className={`w-6 h-6 mx-auto ${
                                provider.highlight
                                  ? "text-primary-600"
                                  : "text-green-500"
                              }`}
                            />
                          ) : (
                            <XMarkIcon className="w-6 h-6 mx-auto text-gray-400" />
                          )}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Ready to experience the difference?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => (window.location.href = "/signup")}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Started Free
            </button>
            <button
              onClick={() =>
                window.open("https://github.com/Emmraan/drivn", "_blank")
              }
              className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              View on Github
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
