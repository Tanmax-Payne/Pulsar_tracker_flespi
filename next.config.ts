import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the `mqtt` package to bundle correctly in the browser.
  // mqtt uses Node.js built-ins (net, tls, dns, fs) — we tell webpack to
  // ignore them in the client bundle since mqtt uses WebSocket in browsers.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net:   false,
        tls:   false,
        dns:   false,
        fs:    false,
        path:  false,
        os:    false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
