import PublicShareView from '@components/share/PublicShareView';

export default async function SharedSpacePage({ params }) {
  const { token } = await params;
  return <PublicShareView token={token} />;
}
