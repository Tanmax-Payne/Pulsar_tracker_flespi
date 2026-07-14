import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/themes.css";

// Runs before hydration so the persisted theme applies with zero flash.
// Keep this id list in sync with lib/themes.ts.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("pulsar:theme");
    var valid = ["current","daylight","ink","hearth","glass","terminal","soft","bauhaus","sage"];
    if (!t || valid.indexOf(t) === -1) t = "current";
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  title: "Pulsar Tracker",
  description: "Real-time GPS tracker — Flespi",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/*
        suppressHydrationWarning on <body> stops React from erroring when
        browser extensions (Grammarly, Dark Reader, etc.) inject attributes
        like class="__text_mode_READY__" before React hydrates.
      */}
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, background: "var(--bg)", overflow: "hidden" }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
