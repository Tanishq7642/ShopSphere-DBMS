/** @type {import('next').NextConfig} */
const nextConfig = {
  // Unoptimized images keep the demo dependency-free (no remote loader needed)
  images: {
    unoptimized: true,
  },
}

export default nextConfig
