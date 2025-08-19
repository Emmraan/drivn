"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

interface CorsConfiguratorProps {
  appUrl: string;
}

const CorsConfigurator: React.FC<CorsConfiguratorProps> = ({ appUrl }) => {
  const [activeTab, setActiveTab] = useState<"xml" | "json">("xml");
  const [copied, setCopied] = useState(false);

  const corsXml = `
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
      <AllowedOrigin>${appUrl}</AllowedOrigin>
      <AllowedMethod>HEAD</AllowedMethod>
      <AllowedMethod>GET</AllowedMethod>
      <AllowedMethod>POST</AllowedMethod>
      <AllowedMethod>PUT</AllowedMethod>
      <AllowedMethod>DELETE</AllowedMethod>
      <AllowedHeader>*</AllowedHeader>
      <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
  `.trim();

  const corsJson = `
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "HEAD",
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ],
    "AllowedOrigins": [
      ${appUrl}
    ],
    "MaxAgeSeconds": 3000
  }
]
  `.trim();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Required CORS Configuration
        </h3>
        <h4 className="text-sm text-yellow-500 dark:text-yellow-300 mb-4">
          If you&apos;re having trouble with CORS, please check your S3 provider&apos;s
          documentation.
        </h4>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("xml")}
              className={`${
                activeTab === "xml"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              XML
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`${
                activeTab === "json"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              JSON
            </button>
          </nav>
        </div>
        <div className="mt-6 relative">
          <AnimatePresence mode="wait">
            <motion.pre
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto"
            >
              <code>{activeTab === "xml" ? corsXml : corsJson}</code>
            </motion.pre>
          </AnimatePresence>
          <button
            onClick={() =>
              copyToClipboard(activeTab === "xml" ? corsXml : corsJson)
            }
            className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {copied ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : (
              <ClipboardIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default CorsConfigurator;
