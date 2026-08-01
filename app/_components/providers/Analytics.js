'use client';

import { usePathname } from 'next/navigation';
import { GoogleAnalytics } from '@next/third-parties/google';

export default function Analytics() {
    const pathname = usePathname();
    if (process.env.NODE_ENV !== 'production' || pathname?.startsWith('/invite')) return null;
    return <GoogleAnalytics gaId="G-FG6W314EEP"/>;
}
