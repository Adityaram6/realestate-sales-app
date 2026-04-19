/** @type {import('next').NextConfig} */
// Deployed via Vercel — API URL comes from NEXT_PUBLIC_API_URL env var.
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@realestate/shared"],
};

export default nextConfig;
