import { db } from "@lib/db";
import { useRouter } from "next/navigation";
import Button from "../common/Button";
import { useLocalStorage } from "@lib/hooks";

export default function DeleteAccountForm({ onCancel }) {
    const router = useRouter();
    const [_, setUsername] = useLocalStorage('username');

    const handleDeleteAccount = async() => {
        // Delete account and reset DB
        setUsername(null);
        await db.resetDB();
        
        router.replace('/');
    }

    return(
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="text-xl font-bold">Delete Account</div>
                <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">Are you sure you want to delete your account?</p>
                <p className="text-dark/80 dark:text-white/80 text-sm md:text-base"><b>Note:</b> your account is <b>NOT</b> recoverable.</p>
            </div>
            <div className="flex justify-end gap-2.5">
                <Button label={"Cancel"} contained onClick={onCancel}/>
                <Button label={"Delete"} style="danger" contained onClick={handleDeleteAccount}/>
            </div>
        </div>
    )
}