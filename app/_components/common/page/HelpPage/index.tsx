'use client';

import dynamic from 'next/dynamic';
import Page from '../Page';

const Help = dynamic(() => import('../../../settings/Help'));

export default function HelpPage({ show, hideFn }) {
  return (
    <Page title="Help" show={show} hideFn={hideFn}>
      <Help />
    </Page>
  );
}
