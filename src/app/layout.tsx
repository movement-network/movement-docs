import '@/app/global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import GoogleAnalytics from '@/components/GoogleAnalytics';

const oracle = localFont({
  src: [
    { path: '../../public/fonts/oracle/ABCOracle-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/oracle/ABCOracle-RegularItalic.woff2', weight: '400', style: 'italic' },
    { path: '../../public/fonts/oracle/ABCOracle-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/oracle/ABCOracle-MediumItalic.woff2', weight: '500', style: 'italic' },
    { path: '../../public/fonts/oracle/ABCOracle-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/oracle/ABCOracle-BoldItalic.woff2', weight: '700', style: 'italic' },
  ],
  display: 'swap',
});

export const metadata: Metadata = {
  // Env-driven so the static `/mvdocs` build can target a different host
  // (set `NEXT_PUBLIC_SITE_URL=https://your-host.com` before `pnpm build:static`).
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.movementnetwork.xyz',
  ),
  title: {
    default: 'Movement Docs',
    template: '%s | Movement Docs',
  },
  description: 'Start Building on the Movement Network',
  openGraph: {
    title: 'Movement Docs',
    description: 'Start Building on the Movement Network',
    url: 'https://docs.movementnetwork.xyz',
    siteName: 'Movement Docs',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Movement Docs',
    description: 'Start Building on the Movement Network',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${oracle.className} dark`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen" suppressHydrationWarning>
        {/* `search.enabled` is gated on STATIC_EXPORT — the search route
            is a Fumadocs Orama backend that can't be pre-rendered, so in
            the static `/mvdocs` build the search bar is hidden. */}
        <RootProvider search={{ enabled: process.env.STATIC_EXPORT !== 'true' }}>
          {children}
        </RootProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
