import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import ToastComponent from '@components/toast/Toast';
import { AppProvider } from '@components/providers/AppProvider';
import Analytics from '@components/providers/Analytics';

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
        <ThemeProvider enableColorScheme enableSystem>
          <AppProvider>{children}</AppProvider>
        </ThemeProvider>
        <ToastComponent />
        <Analytics />
      </body>
    </html>
  );
}
