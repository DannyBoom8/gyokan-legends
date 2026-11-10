/** @type {import('next').NextConfig} */
const nextConfig = {
  // every page is a client page, so the whole site exports to static files served by a Cloudflare Worker
  output: 'export',
};

export default nextConfig;
