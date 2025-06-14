import Image from "next/image";
import { IoLocationSharp as LocationIcon } from "react-icons/io5";
import { useState } from "react";
import Dialog from "../common/Dialog";
import InfoShopForm from "./InfoShopForm";

export default function ShopCard({ shop, isOdd, style }) {
    const { image, name, location } = shop;
    const [showDialog, setShowDialog] = useState(false);

    return (
        <div>
            <div onClick={() => setShowDialog(true)} style={style} className={`cursor-pointer w-full h-full flex flex-col ${!isOdd ? 'pr-2' : ''} pb-2`}>
                <div className="relative w-full aspect-video bg-light dark:bg-neutral-800 rounded-t-lg overflow-hidden">
                    {image && <Image src={image} className="object-contain" fill alt={`${name} Image`}/>}
                </div>
                <div className="pt-2.5 pb-4 px-4 rounded-b-lg bg-light dark:bg-neutral-800 grow">
                    <p className="text-sm md:text-base font-semibold mb-2 line-clamp-2">{name}</p>
                    <div className="flex flex-col gap-1">
                        <div className="text-xs md:text-sm text-dark/80 dark:text-white/80 flex items-start gap-1">
                            <LocationIcon size={18} className="shrink-0"/>
                            <p className="line-clamp-2">{location}</p>
                        </div>
                    </div>
                </div>
            </div>
            <Dialog
                show={showDialog}
                hideFn={() => setShowDialog(false)}
            >
                <InfoShopForm shop={shop} hideFn={() => setShowDialog(false)}/>
            </Dialog>
        </div>
    )
}