/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: standalone output is not used - it requires symlink privileges that
  // are unavailable on stock Windows dev machines. The Dockerfile therefore
  // runs the app with `next start` against the full build instead.
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
