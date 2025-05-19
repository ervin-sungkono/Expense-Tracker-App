'use client'

export default function Button({ 
    label,
    className = '', 
    type='button',
    size = 'medium',
    style = 'primary',
    onClick = null, 
    contained = false 
}) {
    const getSizeClass = () => {
        switch (size) {
            case 'icon':
                return 'p-2.5';
            case 'medium':
                return 'text-base py-2.5 px-6'
            case 'large':
                return 'text-xl py-4 px-10'
        }
    }

    const getStyleClass = () => {
        switch(style) {
            case 'primary':
                return 'bg-basic-gradient'
            case 'danger':
                return 'bg-danger-gradient'
        }
    }

    const getHoverClass = () => {
        switch(style) {
            case 'primary':
                return 'hover:bg-basic-gradient--hover'
            case 'danger':
                return 'hover:bg-danger-gradient--hover'
        }
    }

    return(
        <div className={`${contained ? 'w-fit' : 'w-full'} ${className}`}>
            <div className="relative w-full">
                <button type={type} onClick={onClick} className={`text-white relative cursor-pointer w-full flex justify-center items-center ${getSizeClass()} ${getStyleClass()} ${getHoverClass()} rounded-full font-semibold z-10 hover:scale-[1.04] active:scale-95 transition-all duration-150 ease-in-out`}>
                    {label}
                </button>
                <span className={`absolute w-4/5 h-4/5 ${getStyleClass()} z-[1] opacity-60 left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4 rounded-full blur-[32px]`}></span>
            </div>
        </div>
    )
}