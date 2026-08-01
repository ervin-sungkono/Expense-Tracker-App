'use client';

import Navbar from '../common/navbar/Navbar';
import ActionBar from '../common/ActionBar';
// import BudgetRepeatUpdate from "../budgets/BudgetRepeatUpdate";
import { NAV_ITEMS } from '@lib/const';
import Loading from './Loading';
import { useAuth, useSpace } from '@components/providers/AppProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Layout({
  children,
  hideNavbar = false,
  hideActionBar = false,
  pathname,
  requireAuth = true,
}) {
  const { user, privateKey, authLoading } = useAuth();
  const { activeSpace, spacesLoading } = useSpace();
  const router = useRouter();

  useEffect(() => {
    if (!requireAuth || authLoading || spacesLoading) return;
    if (!user || !privateKey) {
      router.replace('/');
      return;
    }
    if (!activeSpace && pathname !== '/home') router.replace('/home');
  }, [activeSpace, authLoading, pathname, privateKey, requireAuth, router, spacesLoading, user]);

  if (requireAuth && (authLoading || spacesLoading)) return <Loading />;
  if (requireAuth && (!user || !privateKey || (!activeSpace && pathname !== '/home'))) return null;

  const showActionBar = !hideActionBar && Boolean(activeSpace);
  const showNavbar = !hideNavbar && Boolean(activeSpace);

  return (
    <div className="flex flex-col overflow-auto fixed top-0 left-0 bottom-0 right-0">
      {/* <BudgetRepeatUpdate/> */}
      {showActionBar && <ActionBar />}
      {showNavbar && <Navbar items={NAV_ITEMS} pathname={pathname} />}
      <main
        className={`relative w-full h-full overflow-x-hidden overflow-y-auto max-w-3xl px-6 ${showActionBar ? 'pt-4' : 'pt-6'} ${showNavbar ? 'mb-22' : 'pb-8'} mx-auto`}
      >
        {children}
      </main>
    </div>
  );
}
