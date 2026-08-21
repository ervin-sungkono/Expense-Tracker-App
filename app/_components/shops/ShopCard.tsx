import Image from "next/image";
import { IoLocationSharp as LocationIcon } from "react-icons/io5";

export default function ShopCard({ shop, isOdd, style, onClick }) {
    const { image, name, location } = shop;

    const handleShopClick = () => {
        onClick && onClick(shop);
    }

    return (
        <div>
            <div onClick={handleShopClick} style={style} className={`cursor-pointer w-full h-full flex flex-col active:scale-95 transition-transform duration-150 ease-in-out ${!isOdd ? 'pr-2' : ''} pb-2`}>
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
        </div>
    )
}