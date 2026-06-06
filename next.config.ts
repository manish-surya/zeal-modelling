import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/zeal-modelling",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
