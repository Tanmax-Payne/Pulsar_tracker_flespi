import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SWRConfig } from 'swr';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Metro IoT Dashboard',
  description: 'A production-ready IoT dashboard with a Metro UI aesthetic.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-[#efefef] text-[#1a1a1a] antialiased`} suppressHydrationWarning>
        <SWRConfig 
          value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 10000, // 10 seconds
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
