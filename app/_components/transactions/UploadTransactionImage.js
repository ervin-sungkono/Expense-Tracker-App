'use client'
import ImageUploader from "../common/ImageUploader";
import Button from "../common/Button";
import { useState } from "react";
import { detectMimeType } from "@lib/utils";

export default function UploadTransactionImage({ onImageSubmit }) {
    const [errorMessage, setErrorMessage] = useState({});

    const validateImage = (image) => {
        if(!image) {
            return 'Image field is required';
        }

        return null;
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        // Create payload for add transaction
        const payload = {}
        for(const [key, value] of formData.entries()) {
            payload[key] = value;
        }

        payload.image = payload.image || null;

        try{
            let error = {};
            const image = payload.image;

            error.image = validateImage(image);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }

            const imageBase64 = image.split(',')[1];
            const mimeType = detectMimeType(imageBase64);

            onImageSubmit && onImageSubmit({
                imageBase64,
                mimeType
            });
        } catch(e) {
            console.log(e);
            return;
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="text-xl font-bold">Upload Image</div>
                <p className="text-sm md:text-base text-dark/80 dark:text-white/80">
                    Choose a transaction bill to upload, the extracted data will be shown in the form.
                </p>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2 mb-6">
                    <ImageUploader
                        label={"Transaction Image"}
                        name={'image'}
                        dropzoneOptions={{ maxSize: 5000000 }}
                    />
                    {errorMessage.image && <p className="text-[10.8px] md:text-xs text-red-600 dark:text-red-400">{errorMessage.image}</p>}
                </div>
                <Button type="submit" label={'Submit'}/>
            </form>
        </div>
    )
}