/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    appDir: true, // Aktifkan App Router untuk Next.js 14
  },
  async rewrites() {
    return [
      {
         source: '/maps/:path*',
        destination: 'http://mt1.google.com/vt/:path*'
      },{
         source: '/maps/:path*',
        destination: 'http://mt2.google.com/vt/:path*'
      },
      {
        source: '/maps/:path*',
        destination: 'http://mt3.google.com/vt/:path*'
      },
      {
        source: '/maps/:path*',
        destination: 'http://api.maptiler.com/:path*'
      },
      {
        source: '/maps/:path*',
        destination: 'https://demotiles.maplibre.org/:path*'
      }
    ]
  }
};

module.exports = nextConfig;