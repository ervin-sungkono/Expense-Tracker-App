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
    if (requireAuth && !authLoading && (!user || !privateKey || !activeSpace)) router.replace('/');
  }, [activeSpace, authLoading, privateKey, requireAuth, router, user]);

  if (requireAuth && (authLoading || spacesLoading)) return <Loading />;
  if (requireAuth && (!user || !privateKey || !activeSpace)) return null;

  return (
    <div className="flex flex-col overflow-auto fixed top-0 left-0 bottom-0 right-0">
      {/* <BudgetRepeatUpdate/> */}
      {!hideActionBar && <ActionBar />}
      {!hideNavbar && <Navbar items={NAV_ITEMS} pathname={pathname} />}
      <main
        className={`relative w-full h-full overflow-x-hidden overflow-y-auto max-w-3xl px-6 ${hideActionBar ? 'pt-6' : 'pt-4'} ${hideNavbar ? 'pb-8' : 'mb-22'} mx-auto`}
      >
        {children}
      </main>
    </div>
  );
}
