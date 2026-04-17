import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable strict mode's double-mount in dev — it causes Supabase channel
  // subscribe/unsubscribe race conditions. Production builds are unaffected.
  reactStrictMode: false,
};

export default nextConfig;
