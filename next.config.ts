import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components is off: OpenNext on Cloudflare doesn't fully support it
  // yet (pages hang). Pages that read cookies or the request still call
  // connection(), so they render per request as before.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
