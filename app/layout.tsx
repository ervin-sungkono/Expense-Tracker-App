import { Inter } from 'next/font/google';
import './globals.css';
import ToastComponent from '@components/toast/Toast';
import Analytics from '@components/providers/Analytics';
import RootProviders from '@components/providers/RootProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  manifest: '/manifest.json',
  title: 'Xpensed',
  description: 'Track and manage your spendings with Xpensed',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <RootProviders>{children}</RootProviders>
        <ToastComponent />
        <Analytics />
      </body>
    </html>
  );
}
