'use client';
import { IoMdMore as MoreIcon } from 'react-icons/io';
import ContextMenu from './ContextMenu';
import BalanceView from './BalanceView';
import { useState } from 'react';
import CategoryListPage from './page/CategoryListPage';
import AboutAppPage from './page/AboutAppPage';
import BudgetListPage from './page/BudgetListPage';
import SpaceSwitcher from '@components/spaces/SpaceSwitcher';
import SyncStatus from '@components/sync/SyncStatus';

export default function ActionBar() {
  const [showMenu, setShowMenu] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  // const [showReport, setShowReport] = useState(false); TODO: make report page
  const [showAbout, setShowAbout] = useState(false);

  const items = [
    {
      label: 'Categories',
      onClick: () => setShowCategory(true),
    },
    {
      label: 'Budgets',
      onClick: () => setShowBudget(true),
    },
    // {
    //     label: 'Reports',
    //     onClick: () => setShowReport(true)
    // },
    {
      label: 'About',
      onClick: () => setShowAbout(true),
    },
  ];

  return (
    <div className="max-w-3xl w-full px-6 py-1.5 mx-auto bg-ocean-blue ">
      <div className="relative w-full flex items-center">
        <BalanceView />
        <SpaceSwitcher />
        <button
          type="button"
          aria-label="More options"
          onClick={() => setShowMenu(true)}
          className="ml-1 cursor-pointer rounded-full p-1.5 text-white transition-colors duration-150 ease-in-out active:bg-light/20"
        >
          <MoreIcon size={24} />
        </button>
        <ContextMenu
          items={items}
          show={showMenu}
          hideFn={() => setShowMenu(false)}
          position={{ bottom: '-10px' }}
          hideOnItemClick
        >
          <SyncStatus onStarted={() => setShowMenu(false)} />
        </ContextMenu>
      </div>
      <CategoryListPage show={showCategory} hideFn={() => setShowCategory(false)} />
      <AboutAppPage show={showAbout} hideFn={() => setShowAbout(false)} />
      <BudgetListPage show={showBudget} hideFn={() => setShowBudget(false)} />
    </div>
  );
}
