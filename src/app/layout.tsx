import type { Metadata } from 'next';
import '@/app/globals.css';
import { Providers } from '@/providers';

export const metadata: Metadata = {
  title: 'Pulse',
  description: 'A modern productivity platform foundation.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
