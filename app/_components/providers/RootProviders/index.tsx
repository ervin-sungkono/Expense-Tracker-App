'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { AppProvider } from '@components/providers/AppProvider';

export default function RootProviders({ children }) {
  const pathname = usePathname();
  const isPublicShare = pathname === '/share' || pathname?.startsWith('/share/');

  return (
    <ThemeProvider enableColorScheme enableSystem>
      {isPublicShare ? children : <AppProvider>{children}</AppProvider>}
    </ThemeProvider>
  );
}
