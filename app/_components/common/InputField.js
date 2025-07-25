'use client'
import { useEffect, useState } from "react"
import { IoCalendarClearSharp as CalendarIcon } from "react-icons/io5";

export default function InputField({ name, required = false, label, type, placeholder, maxLength, defaultValue = '', inputMode = 'text', errorMessage = '', ref = null, onChange, readOnly = false }) {
    const [value, setValue] = useState('');

    useEffect(() => {
        setValue(defaultValue);
    }, [defaultValue])
    
    return(
        <div className="w-full flex flex-col gap-2">
            {label && 
            <label htmlFor={`id-${name}`} className="block font-semibold text-xs md:text-sm text-dark-blue">
                {label}
                {required && <span className="text-red-600">*</span>}
            </label>}
            <div className="relative flex flex-col gap-1">
                <input 
                    ref={ref}
                    id={`id-${name}`}
                    name={name}
                    type={type}
                    value={value}
                    onInput={(e) => setValue(e.target.value)}
                    onChange={onChange}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    inputMode={inputMode}
                    readOnly={readOnly}
                    className={`w-full outline-none read-only:border-neutral-300 read-only:dark:border-neutral-600 focus:border-sky-blue px-3 md:px-4 py-2 md:py-2.5 rounded-md bg-transparent border ${ errorMessage ? "border-red-600 dark:border-red-400" : "border-deep-blue dark:border-ocean-blue/60"} text-dark dark:text-white text-sm transition-colors duration-200 ease-in-out`}
                />
                {(type === 'date' || type === 'datetime-local') && <CalendarIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-blue dark:text-white"/>}
                {errorMessage && <p className="text-[10.8px] md:text-xs text-red-600 dark:text-red-400">{errorMessage}</p>}
            </div>
        </div>
    )
}