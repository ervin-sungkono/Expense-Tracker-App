'use client'
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

export default function FileUploader({ label, name, dropzoneOptions = {}, onFileUploaded }) {
    const { acceptedFiles, getRootProps, getInputProps, fileRejections } = useDropzone({
        ...dropzoneOptions,
        multiple: false,
        maxFiles: 1
    });
    const [previewFile, setPreviewFile] = useState();
    const [errorMessage, setErrorMessage] = useState(null);

    const getErrorMessage = (error) => {
        if(error.code === 'file-too-large') {
            return `File size exceeds maximum allowed limit`;
        }

        return error.message;
    }

    useEffect(() => {
        if(acceptedFiles.length > 0) {
            setPreviewFile(acceptedFiles[0].name)
            onFileUploaded && onFileUploaded(acceptedFiles[0]);
        }
    }, [acceptedFiles])

    useEffect(() => {
        if(fileRejections.length > 0) {
            setErrorMessage(getErrorMessage(fileRejections[0].errors[0]));
        } else {
            setErrorMessage(null)
        }
    }, [fileRejections])

    return(
        <div className="w-full flex flex-col gap-2">
            {label && <div className="block font-semibold text-xs md:text-sm text-dark-blue">{label} {dropzoneOptions.maxSize && <span>(max {(dropzoneOptions.maxSize / (1000 * 1000)).toFixed(0)} MB)</span>}</div>}
            <div {...getRootProps({className: 'relative flex flex-col justify-center items-center min-h-32 dropzone cursor-pointer border focus:border-sky-blue border-deep-blue dark:border-ocean-blue/60 px-3 md:px-4 py-2 md:py-2.5 rounded-md'})}>
                <input name={name} {...getInputProps()} />
                <p className="text-center text-sm md:text-base mb-2 font-semibold">{previewFile ?? "Empty"}</p>
                <p className="text-xs md:text-sm text-dark/80 dark:text-white/80 text-center">Drag and drop file here, or click to select from folder</p>
                {errorMessage && <p className="text-center text-[10.8px] md:text-xs text-red-600 dark:text-red-400 mt-1">{errorMessage}</p>}
            </div>
        </div>
    
    )
}