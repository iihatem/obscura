/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist v5 is ESM-only with private class fields and browser-only top-level
  // code (DOMMatrix, etc.). transpilePackages forces webpack to properly process
  // the ESM syntax and private fields rather than treating it as a raw external.
  transpilePackages: ['pdfjs-dist'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  webpack: (config) => {
    // pdfjs-dist references the `canvas` package for Node.js server-side rendering.
    // We don't need it; aliasing to false prevents a build warning/error.
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
