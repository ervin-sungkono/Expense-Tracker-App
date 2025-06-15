'use client'
import { useEffect, useRef, useState } from "react"

export default function SelectField({ customSelected, label, name, required = false, _selected, placeholder, _options = [], errorMessage, onChange, overrideOnClick, disabled }){
    const [options, setOptions] = useState(_options);
    const [selected, setSelected] = useState(null);
    const [showOption, setShowOption] = useState(false);
    const dropdownRef = useRef();

    useEffect(() => {
        if(_selected != null && options) setSelected(options.find(option => option.id == _selected))
    }, [_selected, options])

    useEffect(() => {
        if(JSON.stringify(_options) !== JSON.stringify(options)) setOptions(_options);
    }, [_options, options])

    useEffect(() => {
        if(dropdownRef?.current && showOption && selected?.id) {
            dropdownRef.current.scrollIntoView({ block: 'nearest' });
            dropdownRef.current.querySelector(`#${name}-${selected.id}`).scrollIntoView({ block: 'nearest' });
        }
    }, [showOption, dropdownRef, selected])
    
    return(
        <div className="flex flex-col gap-2">
            {label &&
            <label htmlFor={`id-${name}`} className="block font-semibold text-xs md:text-sm text-dark-blue">
                {label}
                {required && <span className="text-red-600">*</span>}
            </label>}
            <div className="relative">
                <input 
                    name={name}
                    type="text"
                    defaultValue={selected?.id}
                    readOnly
                    hidden
                />
                <div 
                    id={`id-${name}`}
                    onClick={overrideOnClick ? overrideOnClick : () => setShowOption(true)}
                    className={`${disabled ? 'pointer-events-none bg-ocean-blue/10' : 'bg-transparent'} cursor-pointer w-full outline-none focus:border-sky-blue px-3 md:px-4 py-2 md:py-2.5 rounded-md border ${errorMessage ? "border-red-600 dark:border-red-400" : "border-deep-blue dark:border-ocean-blue/60"} text-dark dark:text-white text-sm transition-colors duration-200 ease-in-out`}
                >
                    {customSelected ?? (selected ? selected.label : placeholder)}
                </div>
                {!overrideOnClick &&
                <div className={`${showOption ? 'block' : 'hidden'}`}>
                    <div className="fixed top-0 left-0 w-full h-full bg-transparent z-10" onClick={() => setShowOption(false)}></div>
                    <div ref={dropdownRef} className="min-w-40 max-w-72 max-h-96 overflow-y-auto absolute left-0 -bottom-2 translate-y-full shadow-lg bg-light dark:bg-neutral-600 py-2 rounded-md z-50">
                        {options.map(option => (
                            <div 
                                id={`${name}-${option.id}`}
                                key={option.id}
                                className={`cursor-pointer w-full line-clamp-1 wrap-anywhere px-4 py-1.5 ${(selected && selected.id == option.id) ? 'bg-neutral-200 dark:bg-neutral-500' : 'hover:bg-neutral-200 hover:dark:bg-neutral-500'} text-sm`}
                                onClick={() => {
                                    setSelected(option);
                                    setShowOption(false);
                                    onChange && onChange(option.id);
                                }}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                </div>}
            </div>
            {errorMessage && <p className="text-[10.8px] md:text-xs text-red-600 dark:text-red-400">{errorMessage}</p>}
        </div>
    )
}