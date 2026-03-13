/** @type {import('next').NextConfig} */
const nextConfig = { 
  reactStrictMode: true,
  outputFileTracingExcludes: {
    '*': ['**/*.map', '**/.cache/**/*']
  }
};
export default nextConfig;