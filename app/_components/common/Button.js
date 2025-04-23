'use client'

export default function Button({ 
    label, 
    className = '', 
    type='button',
    size = 'medium', 
    onClick = null, 
    contained = false 
}) {
    const getSizeClass = () => {
        switch (size) {
            case 'medium':
                return 'text-base py-2.5 px-6'
            case 'large':
                return 'text-xl py-4 px-10'
        }
    }

    return(
        <div className={`${contained ? 'w-fit' : 'w-full'} ${className}`}>
            <div className="relative w-full">
                <button type={type} onClick={onClick} className={`relative cursor-pointer w-full flex justify-center items-center ${getSizeClass()} bg-basic-gradient rounded-full font-semibold z-fixed hover:bg-basic-gradient--hover hover:scale-[1.04] active:scale-95 transition-all duration-150 ease-in-out`}>
                    {label}
                </button>
                <span className="absolute w-4/5 h-4/5 bg-basic-gradient left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4 rounded-full blur-[48px]"></span>
            </div>
        </div>
    )
}