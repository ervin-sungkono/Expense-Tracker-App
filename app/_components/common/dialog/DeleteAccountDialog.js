import { db } from "@/app/_lib/db";
import { useRouter } from "next/navigation";
import Dialog from "./Dialog";
import Button from "../Button";
import { useLocalStorage } from "@/app/_lib/hooks";

export default function DeleteAccountDialog({ categoryId, show, hideFn }) {
    const router = useRouter();
    const [_, setUsername] = useLocalStorage('username');

    const handleDeleteAccount = async() => {
        // Delete account and reset DB
        setUsername(null);
        await db.resetDB();
        
        router.replace('/');
    }

    return(
        <Dialog
            show={show}
            hideFn={hideFn}
            hideCancelButton
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <div className="text-xl font-bold">Delete Account</div>
                    <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">Are you sure you want to delete your account?</p>
                    <p className="text-dark/80 dark:text-white/80 text-sm md:text-base"><b>Note:</b> your account is <b>NOT</b> recoverable.</p>
                </div>
                <div className="flex justify-end gap-2.5">
                    <Button label={"Cancel"} contained onClick={hideFn}/>
                    <Button label={"Delete"} style="danger" contained onClick={handleDeleteAccount}/>
                </div>
            </div>
        </Dialog>
    )
}