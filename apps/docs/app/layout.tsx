import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import './globals.css';

const siteUrl = 'https://ai-sdk.pro';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Documentation · ai-sdk.pro',
    template: '%s · ai-sdk.pro',
  },
  description: 'Thai-first documentation for building, integrating, and self-hosting ai-sdk.pro agents.',
  alternates: {
    canonical: `${siteUrl}/docs/getting-started`,
  },
  openGraph: {
    type: 'website',
    siteName: 'ai-sdk.pro',
    title: 'ai-sdk.pro documentation',
    description: 'Build agents, connect the client SDK, and run your own infrastructure.',
    url: `${siteUrl}/docs/getting-started`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <RootProvider
          theme={{ attribute: 'class', defaultTheme: 'dark', enableSystem: false }}
          search={{ options: { api: '/api/search' } }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
