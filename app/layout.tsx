import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Pulsar Tracker",
  description: "Real-time GPS tracker dashboard powered by Flespi",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Prevent zoom on input focus (iOS)
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Preconnect to Google Fonts so IBM Plex Mono loads fast.
          The actual @import is in the global <style jsx global> in page.tsx,
          keeping font loading as a single CSS request.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0d1117", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
