'use client'
import ImageUploader from "../common/ImageUploader";
import Button from "../common/Button";

export default function UploadTransactionImage({ onImageSubmit }) {
    const handleSubmit = (e) => {
        e.preventDefault();
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
                <div className="flex flex-col gap-4 mb-6">
                    <ImageUploader
                        label={"Transaction Image"}
                        name={'image'}
                        dropzoneOptions={{ maxSize: 5000000 }}
                    />
                </div>
                <Button type="submit" label={'Submit'}/>
            </form>
        </div>
    )
}