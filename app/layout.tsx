import type { Metadata, Viewport } from "next";

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
      </head>
      {/*
        suppressHydrationWarning on <body> stops React from erroring when
        browser extensions (Grammarly, Dark Reader, etc.) inject attributes
        like class="__text_mode_READY__" before React hydrates.
      */}
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, background: "#0d1117", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
