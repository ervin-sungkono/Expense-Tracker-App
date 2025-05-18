import Image from "next/image";
import { IoLocationSharp as LocationIcon } from "react-icons/io5";
import { useState } from "react";
import InfoShopDialog from "../common/dialog/InfoShopDialog";

export default function ShopCard({ shop, isOdd, style }) {
    const { image, name, location } = shop;
    const [showDialog, setShowDialog] = useState(false);

    return (
        <div>
            <div onClick={() => setShowDialog(true)} style={style} className={`cursor-pointer select-none w-full h-full flex flex-col ${!isOdd ? 'pr-2' : ''} pb-2`}>
                <div className="relative w-full aspect-video bg-neutral-200 dark:bg-neutral-700 rounded-t-lg overflow-hidden">
                    {image && <Image src={image} className="object-contain" fill alt={`${name} Image`}/>}
                </div>
                <div className="pt-2.5 pb-4 px-4 rounded-b-lg bg-white dark:bg-neutral-700 grow">
                    <p className="text-base md:text-lg font-semibold mb-2">{name}</p>
                    <div className="flex flex-col gap-1">
                        <div className="text-sm text-dark/80 dark:text-white/80 flex items-center gap-1">
                            <LocationIcon size={20}/>
                            <p>{location}</p>
                        </div>
                    </div>
                </div>
            </div>
            <InfoShopDialog
                shop={shop}
                show={showDialog}
                hideFn={() => setShowDialog(false)}
            />
        </div>
    )
}