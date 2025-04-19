import Image from "next/image"

export default function SplashImage({ className }) {
    return(
        <div className={`relative w-full mx-auto max-w-100 aspect-square mb-10 ${className}`}>
            <Image 
                fill
                quality={100}
                src={"/onboarding/splash-img.png"} 
                className="object-contain z-50" 
                aria-hidden 
                alt=""
            />
            <Image 
                width={39}
                height={25}
                quality={100}
                src={"/onboarding/blob1.png"} 
                className="absolute top-1/5 left-2 z-50 animate-[spin_4s_linear_infinite]" 
                aria-hidden 
                alt=""
            />
            <Image 
                width={47}
                height={33}
                quality={100}
                src={"/onboarding/blob2.png"} 
                className="absolute top-1 right-6 z-50 animate-[spin_7s_linear_infinite]" 
                aria-hidden 
                alt=""
            />
            <Image 
                width={46}
                height={35}
                quality={100}
                src={"/onboarding/blob3.png"} 
                className="absolute -bottom-4 right-1/4 z-50 animate-[spin_10s_linear_infinite]" 
                aria-hidden 
                alt=""
            />
            <span className="absolute top-1/2 left-1/2 -translate-1/2 w-3/5 h-3/5 bg-basic-gradient blur-[100px] opacity-40 rounded-full"></span>
        </div>
    )
}