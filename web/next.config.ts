import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so an unrelated parent lockfile is not picked up.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
