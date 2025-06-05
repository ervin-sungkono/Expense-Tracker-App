import { db } from "@/app/_lib/db";
import Button from "../common/Button";

export default function DeleteShopForm({ shopId, onDelete, onCancel }) {
    const handleDeleteShop = () => {
        db.deleteShop(shopId);
        onDelete && onDelete();
    }

    return(
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="text-xl font-bold">Delete Shop</div>
                <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">Are you sure you want to delete this shop?</p>
                <p className="text-dark/80 dark:text-white/80 text-sm md:text-base"><b>Note:</b> all transactions referencing this shop will <b>NOT</b> be deleted.</p>
            </div>
            <div className="flex justify-end gap-2.5">
                <Button label={"Cancel"} contained onClick={onCancel}/>
                <Button label={"Delete"} style="danger" contained onClick={handleDeleteShop}/>
            </div>
        </div>
    )
}