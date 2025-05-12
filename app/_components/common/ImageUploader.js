'use client'
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { getBase64 } from "@/app/_lib/utils";
import { IoMdClose as CloseIcon } from "react-icons/io";
import imageCompression from "browser-image-compression";
import Image from "next/image";

export default function ImageUploader({ label, name, initialValue, dropzoneOptions = {} }) {
    const [previewImage, setPreviewImage] = useState(initialValue);
    const { acceptedFiles, getRootProps, getInputProps, fileRejections } = useDropzone({
        ...dropzoneOptions,
        multiple: false,
        maxFiles: 1
    });
    const [errorMessage, setErrorMessage] = useState(null);

    const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1440
    }

    // Currently, this component only supports single file upload
    useEffect(() => {
        if(acceptedFiles.length > 0) {
            imageCompression(acceptedFiles[0], compressionOptions)
                .then(compressedImage => getBase64(compressedImage))
                .then(res => setPreviewImage(res))
        }
    }, [acceptedFiles])

    const getErrorMessage = (error) => {
        if(error.code === 'file-too-large') {
            return `File size exceeds maximum allowed limit`;
        }

        return error.message;
    }

    useEffect(() => {
        if(fileRejections.length > 0) {
            setErrorMessage(getErrorMessage(fileRejections[0].errors[0]));
        } else {
            setErrorMessage(null)
        }
    }, [fileRejections])

    const removePreview = (e) => {
        e.stopPropagation();

        setPreviewImage(null);
    }

    return(
        <div className="w-full flex flex-col gap-2">
            {label && <div className="block font-semibold text-xs md:text-sm text-dark-blue">{label} (max {(dropzoneOptions.maxSize / (1000 * 1000)).toFixed(0)} MB)</div>}
            <div {...getRootProps({className: 'relative dropzone cursor-pointer border focus:border-sky-blue border-deep-blue dark:border-ocean-blue/60 px-3 md:px-4 py-2 md:py-2.5 rounded-md'})}>
                <div className="relative flex justify-center items-center w-full h-48 bg-neutral-100 dark:bg-neutral-600 rounded-sm mb-2">
                    {previewImage ? 
                    <Image src={previewImage} alt="Preview Image" fill className="object-contain aspect-square"/> :
                    <p className="text-dark/80 dark:text-white/80 font-semibold">Preview Image</p>}
                </div>
                <input name={name} type='text' value={previewImage ?? ''} readOnly hidden/>
                <input {...getInputProps()} />
                <p className="text-xs md:text-sm text-dark/80 dark:text-white/80 text-center">Drag and drop file here, or click to select from folder</p>
                {errorMessage && <p className="text-center text-[10.8px] md:text-xs text-red-600 dark:text-red-400 mt-1">{errorMessage}</p>}
                {previewImage && <button type="button" className="absolute cursor-pointer p-2 bg-basic-gradient rounded-bl-lg right-0 top-0" onClick={removePreview}>
                    <CloseIcon size={20}/>
                </button>}
            </div>
        </div>
    
    )
}