import { db } from '@lib/db';
import { useRouter } from 'next/navigation';
import Button from '@components/common/Button';
import { toast } from 'react-toastify';
import { useAuth } from '@components/providers/AppProvider';

export default function DeleteAccountForm({ onCancel }) {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleDeleteAccount = async () => {
    await db.resetDB();
    await signOut();
    toast.success('Local data cleared');

    router.replace('/');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="text-xl font-bold">Clear this device</div>
        <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">
          Remove offline data and sign out on this device?
        </p>
        <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">
          Synced data remains in your spaces.
        </p>
      </div>
      <div className="flex justify-end gap-2.5">
        <Button label={'Cancel'} contained onClick={onCancel} />
        <Button label={'Clear'} style="danger" contained onClick={handleDeleteAccount} />
      </div>
    </div>
  );
}
