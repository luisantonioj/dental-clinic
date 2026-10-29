import type { NextConfig } from "next";

// Cache Components is off on purpose: every page reads the session and shows
// private, per-dentist data, so all routes render dynamically per request.
const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
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
