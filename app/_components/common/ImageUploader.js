'use client'
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { getBase64 } from "@/app/_lib/utils";
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

    useEffect(() => {
        if(fileRejections.length > 0) {
            console.log(fileRejections)
        } else {
            setErrorMessage(null)
        }
    }, [fileRejections])

    return(
        <div className="w-full flex flex-col gap-2">
            {label && <div className="block font-semibold text-xs md:text-sm text-dark-blue">{label}</div>}
            <div {...getRootProps({className: 'dropzone cursor-pointer border focus:border-sky-blue border-deep-blue dark:border-ocean-blue/60 px-3 md:px-4 py-2 md:py-2.5 rounded-md'})}>
                <div className="relative flex justify-center items-center w-full h-40 bg-neutral-100 dark:bg-neutral-600 rounded-sm mb-2">
                    {previewImage ? 
                    <Image src={previewImage} alt="Preview Image" fill className="object-contain aspect-square"/> :
                    <p>Preview Image</p>}
                </div>
                <input name={name} type='text' value={previewImage ?? ''} readOnly hidden/>
                <input {...getInputProps()} />
                <p className="text-xs md:text-sm text-dark/80 dark:text-white/80 text-center">Drag and drop file here, or click to select from folder</p>
            </div>
        </div>
        
    )
}