'use client';

import Layout from '@components/layout/Layout';
import Header from '@components/common/Header';
import SpaceManagement from '@components/spaces/SpaceManagement';

export default function SpacesPage() {
    return <Layout pathname="/settings"><Header title="Spaces & sharing" textAlign="center"/><SpaceManagement/></Layout>;
}
