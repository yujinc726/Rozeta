/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // PDF.js를 클라이언트 사이드에서만 사용하도록 설정
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist': false,
        canvas: false,
      }
    } else {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      }
    }
    return config
  },
}

export default nextConfig
