/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/zeal-modelling",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
