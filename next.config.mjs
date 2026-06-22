/** @type {import('next').NextConfig} */
const nextConfig = {
  // undici is imported directly (lib/wp-client.ts) for the Cloudflare-bypass
  // dispatcher. Keep it external so Next doesn't try to webpack-bundle it.
  experimental: {
    serverComponentsExternalPackages: ['undici'],
  },
};

export default nextConfig;
