'use client'
import { useEffect, useRef, useState } from "react"

export default function SelectField({ label, name, required = false, _selected, placeholder, _options = [], errorMessage, onChange }){
    const [options, _] = useState(_options);
    const [selected, setSelected] = useState(_selected);
    const [showOption, setShowOption] = useState(false);
    const dropdownRef = useRef();

    useEffect(() => {
        if(dropdownRef?.current && showOption && selected?.id) {
            dropdownRef.current.querySelector(`#${name}-${selected.id}`).scrollIntoView({ block: 'center' });
        }
    }, [showOption, dropdownRef, selected])
    
    return(
        <div className="flex flex-col gap-2">
            <label htmlFor={`id-${name}`} className="block font-semibold text-xs md:text-sm text-dark-blue">
                {label}
                {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative">
                <input 
                    name={name}
                    type="text"
                    value={selected?.id}
                    className={`hidden`}
                    onChange={onChange}
                    readOnly
                />
                <div 
                    id={`id-${name}`}
                    onClick={() => setShowOption(true)}
                    className={`cursor-pointer w-full outline-none focus:border-sky-blue px-3 md:px-4 py-2 md:py-2.5 rounded-md bg-transparent border ${errorMessage ? "border-red-600 dark:border-red-400" : "border-deep-blue dark:border-ocean-blue/60"} text-dark dark:text-white text-sm transition-colors duration-200 ease-in-out`}
                >
                    {selected ? selected.label : placeholder}
                </div>
                <div className={`${showOption ? 'block' : 'hidden'}`}>
                    <div className="fixed top-0 left-0 w-full h-full bg-transparent z-10" onClick={() => setShowOption(false)}></div>
                    <div ref={dropdownRef} className="min-w-40 max-w-72 max-h-96 overflow-y-auto absolute left-0 -bottom-2 translate-y-full bg-white dark:bg-neutral-600 py-2 rounded-md z-50">
                        {options.map(option => (
                            <div 
                                id={`${name}-${option.id}`}
                                key={option.id}
                                className={`cursor-pointer w-full line-clamp-1 wrap-anywhere px-4 py-1.5 ${(selected && selected.id === option.id) ? 'bg-neutral-200 dark:bg-neutral-500' : 'hover:bg-neutral-200 hover:dark:bg-neutral-500'} text-base md:text-sm`}
                                onClick={() => {
                                    setSelected(option);
                                    setShowOption(false);
                                }}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {errorMessage && <p className="text-[10.8px] md:text-xs text-red-600 dark:text-red-400">{errorMessage}</p>}
        </div>
    )
}