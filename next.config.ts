import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      // --- Universal S3 Style (covers AWS, Wasabi, Oracle, OVH, etc) ----
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.*" },

      // --- Generic S3 compatible buckets (eg: *.s3-compatible.example.com) ---
      { protocol: "https", hostname: "*.s3-*.*" },
      { protocol: "https", hostname: "*.s3-compat.*" },
      { protocol: "https", hostname: "*.s3compatible.*" },

      // --- Public cloud providers with unique suffixes ----
      // DigitalOcean Spaces
      { protocol: "https", hostname: "*.digitaloceanspaces.com" },
      { protocol: "https", hostname: "*.cdn.digitaloceanspaces.com" },

      // Backblaze B2
      { protocol: "https", hostname: "*.backblazeb2.com" },
      { protocol: "https", hostname: "f*.backblaze.com" },

      // Linode
      { protocol: "https", hostname: "*.linodeobjects.com" },

      // Cloudflare R2
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },

      // Scaleway
      { protocol: "https", hostname: "*.scw.cloud" },

      // iDrive e2
      { protocol: "https", hostname: "*.e2.idrive.com" },

      // Alibaba Cloud OSS
      { protocol: "https", hostname: "*.oss-*.aliyuncs.com" },

      // DreamHost
      { protocol: "https", hostname: "objects.dreamhost.com" },

      // Tebi
      { protocol: "https", hostname: "*.tebi.io" },

      // Google Cloud Storage (not strictly S3, but used similarly)
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "*.storage.googleapis.com" },

      // IBM Cloud COS
      { protocol: "https", hostname: "*.cloud-object-storage.appdomain.cloud" },

      // ---- Catch-all for true self-hosted MinIO / custom (http + https) ---
      { protocol: "https", hostname: "*", pathname: "/**" },
      { protocol: "http", hostname: "*", pathname: "/**" },
    ],
  },
};

export default nextConfig;
