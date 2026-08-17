import type { NextConfig } from "next";
import { networkInterfaces } from "os";

const isDev = process.env.NODE_ENV !== "production";

// DHCP can reassign this machine's LAN IP between runs, so detect it fresh on every dev
// server start rather than hardcoding it.
function currentLanIPs(): string[] {
  const addrs: string[] = [];
  for (const iface of Object.values(networkInterfaces())) {
    for (const info of iface ?? []) {
      if (info.family === "IPv4" && !info.internal) addrs.push(info.address);
    }
  }
  return addrs;
}

// Turbopack's dev client needs 'unsafe-eval' for HMR and injects inline bootstrap/debug-channel
// scripts that require 'unsafe-inline' too; production gets neither.
const scriptSrc = isDev ? "'self' 'unsafe-eval' 'unsafe-inline'" : "'self'";

const ContentSecurityPolicy = [
  `default-src 'self'`,
  `script-src ${scriptSrc}`,
  `style-src 'self' 'unsafe-inline'`, // Tailwind/Next inject inline styles at runtime
  `img-src 'self' data:`,
  `font-src 'self'`,
  `connect-src 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // Next.js blocks cross-origin dev-server requests by default; without this, pages loaded
  // from another device on the LAN hydrate but RSC/data requests get silently blocked.
  ...(isDev ? { allowedDevOrigins: currentLanIPs() } : {}),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
