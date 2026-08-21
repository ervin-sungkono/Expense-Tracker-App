'use client'

export default function LoadingSpinner({ color, size = 'default' }) {
    const getSizeClass = () => {
        switch(size) {
            case 'small':
                return 'w-8 h-8 border-4';
            case 'medium':
                return 'w-16 h-16 border-8';
            case 'default':
                return 'w-24 h-24 md:w-36 md:h-36 border-12 md:border-18';
        }
    }

    const getBorderColor = () => {
        if(!color) return 'border-ocean-blue/50 border-t-ocean-blue';
    }

    return (
        <div 
            className={`${getSizeClass()} ${getBorderColor()} rounded-full animate-[rotate-spinner_1s_linear_infinite]`}
            style={color && { borderColor: `${color}80`, borderTopColor: color }}
        ></div>
    )
}