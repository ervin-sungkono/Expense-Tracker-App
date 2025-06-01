'use client'
import Image from "next/image"

export default function IconCard({ src, onClick, style }) {    
    return(
        <div className="w-full flex flex-col justify-center items-center pb-4" style={style}>
            <div onClick={() => onClick(src)} className="cursor-pointer relative w-12 h-12 flex justify-center items-center bg-neutral-300 dark:bg-neutral-600 rounded-full active:scale-95 transition-transform duration-150 ease-in-out">
                {src && <Image loading="eager" width={32} height={32} src={`./category_icons/${src}`} alt={src.split('_').join(' ').replace('.svg', '')}/>}
            </div>
        </div>
    )
}