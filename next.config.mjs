/** @type {import('next').NextConfig} */
const nextConfig = {
  // Unoptimized images keep the demo dependency-free (no remote loader needed)
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
}

export default nextConfig
