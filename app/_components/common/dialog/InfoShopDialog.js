'use client'
import Dialog from "./Dialog";
import { db } from "@/app/_lib/db";
import InputField from "../InputField";
import Button from "../Button";
import { useState } from "react";
import DeleteShopDialog from "./DeleteShopDialog";
import ImageUploader from "../ImageUploader";

export default function InfoShopDialog({ shop, show, hideFn }) {
    const [errorMessage, setErrorMessage] = useState({});
    const [showDelete, setShowDelete] = useState(false);

    const handleDelete = () => {
        setShowDelete(false);
        hideFn && hideFn();
    }

    // TODO: make validator utils(?) or just use yup.
    const validateName = (name) => {
        if(!name) {
            return 'Name must be filled.';
        }
        if(name.length < 3) {
            return 'Name must be at least 3 characters.'
        }
    }

    const validateLocation = (location) => {
        if(!location) {
            return 'Location must be filled';
        }
        if(location.length < 3) {
            return 'Location must be at least 3 characters.'
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        // Create payload for add expense
        const payload = {}
        for(const [key, value] of formData.entries()) {
            payload[key] = value;
        }

        payload.image = payload.image || null;

        console.log(payload);

        try{
            let error = {};
            const { image, name, location } = payload;

            error.name = validateName(name);
            error.location = validateLocation(location);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }


            db.updateShop(shop.id, payload);
            form.reset();
            hideFn && hideFn();
        } catch(e) {
            console.log(e);
            return;
        }
    }

    return(
        <>
            <Dialog
                show={show}
                hideFn={hideFn}
            >
                <div className="flex flex-col gap-4">
                    <div className="text-xl font-bold">Shop Detail</div>
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-4 mb-6">
                            <ImageUploader
                                name={"image"}
                                label="Image"
                                initialValue={shop.image}
                                dropzoneOptions={{
                                    accept: { 'image/*': [] },
                                    maxSize: 5 * 1000 * 1000, // 5MB
                                }}
                            />
                            <InputField 
                                required
                                name={"name"} 
                                label={"Name"} 
                                placeholder={"Enter shop name"}
                                defaultValue={shop.name}
                                errorMessage={errorMessage?.name}
                            />
                            <InputField 
                                required
                                name={"location"} 
                                label={"Location"} 
                                placeholder={"Enter shop location"}
                                defaultValue={shop.location}
                                errorMessage={errorMessage?.location}
                            />
                        </div>
                        <div className="flex justify-end gap-2.5">
                            <Button label={"Delete"} style="danger" contained onClick={() => setShowDelete(true)}/>
                            <Button type="submit" label={"Edit"} contained/>
                        </div>
                    </form>
                </div>
            </Dialog>
            <DeleteShopDialog
                shopId={shop.id}
                show={showDelete}
                hideFn={() => setShowDelete(false)}
                onDelete={handleDelete}
            />
        </>
    )
}