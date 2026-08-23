'use client';

import Navbar from '@components/common/navbar/Navbar';
import ActionBar from '@components/common/ActionBar';
import { NAV_ITEMS } from '@lib/const';
import Loading from '@components/layout/Loading';
import { useAuth, useSpace } from '@components/providers/AppProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import GuestMigrationDialog from '@components/guest/GuestMigrationDialog';
import dynamic from 'next/dynamic';

const AssistantChat = dynamic(() => import('@components/assistant/AssistantChat'), { ssr: false });

export default function Layout({
  children,
  hideNavbar = false,
  hideActionBar = false,
  pathname,
  requireAuth = true,
}) {
  const { user, authLoading } = useAuth();
  const { activeSpace, spacesLoading } = useSpace();
  const router = useRouter();

  useEffect(() => {
    if (!requireAuth || authLoading || spacesLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!activeSpace && pathname !== '/home') router.replace('/home');
  }, [activeSpace, authLoading, pathname, requireAuth, router, spacesLoading, user]);

  if (requireAuth && (authLoading || spacesLoading)) return <Loading />;
  if (requireAuth && (!user || (!activeSpace && pathname !== '/home'))) return null;

  const showActionBar = !hideActionBar && Boolean(activeSpace);
  const showNavbar = !hideNavbar && Boolean(activeSpace);

  return (
    <>
      <div className="flex flex-col overflow-auto fixed top-0 left-0 bottom-0 right-0">
        {showActionBar && <ActionBar />}
        {showNavbar && <Navbar items={NAV_ITEMS} pathname={pathname} />}
        <main
          className={`relative w-full h-full overflow-x-hidden overflow-y-auto max-w-3xl px-6 ${showActionBar ? 'pt-4' : 'pt-6'} ${showNavbar ? 'mb-22' : 'pb-8'} mx-auto`}
        >
          {children}
        </main>
        <GuestMigrationDialog />
      </div>
      <AssistantChat />
    </>
  );
}
