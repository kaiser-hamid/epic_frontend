import type { NextConfig } from "next"

import { serverEnv } from "./lib/env"

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser only talks to this origin; Laravel stays behind the rewrite,
  // so Sanctum's session and XSRF cookies are first-party and no CORS is needed.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${serverEnv.API_URL}/api/:path*` },
      {
        source: "/sanctum/:path*",
        destination: `${serverEnv.API_URL}/sanctum/:path*`,
      },
    ]
  },
}

export default nextConfig
