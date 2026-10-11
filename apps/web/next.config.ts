import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker image uchun (apps/web/Dockerfile): `.next/standalone` — mustaqil server + minimal node_modules.
  output: "standalone",
  // Monorepo: bog'liqliklar repo ildizidagi node_modules'dan kuzatiladi.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
};

export default nextConfig;
