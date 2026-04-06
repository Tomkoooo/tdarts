import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Monorepo: load env from repository root (apps/web -> repo root is two levels up)
const configDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(configDir, "..", "..");
loadEnv({ path: path.join(monorepoRoot, ".env") });
loadEnv({ path: path.join(monorepoRoot, ".env.local"), override: true });
// Optional app-local overrides
loadEnv({ path: path.join(configDir, ".env") });
loadEnv({ path: path.join(configDir, ".env.local"), override: true });

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Traced production server bundle for smaller Docker images (see Dockerfile).
  output: 'standalone',
  /** Transpile workspace TS packages when bundling the App Router (Turbopack). */
  transpilePackages: ['@tdarts/api', '@tdarts/services', '@tdarts/schemas', '@tdarts/core'],
  serverExternalPackages: ['mongoose'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tdarts.hu',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'tdarts.hu',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://tdarts.hu, https://amator.tdarts.hu, http://localhost:3001',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/(hu|en|de)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/(hu|en|de)/(home|profile|statistics|myclub|board|tournaments|admin|feedback)(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
