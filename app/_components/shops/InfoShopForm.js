'use client'
import Dialog from "../common/Dialog";
import { db } from "@/app/_lib/db";
import InputField from "../common/InputField";
import Button from "../common/Button";
import { useState } from "react";
import ImageUploader from "../common/ImageUploader";
import { StringValidator } from "@/app/_lib/validator";
import DeleteShopForm from "./DeleteShopForm";

export default function InfoShopForm({ shop, hideFn }) {
    const [errorMessage, setErrorMessage] = useState({});
    const [showDelete, setShowDelete] = useState(false);

    const handleDelete = () => {
        setShowDelete(false);
        hideFn && hideFn();
    }

    const validateName = (name) => {
        return new StringValidator("Name", name)
            .required()
            .minLength(3)
            .maxLength(30)
            .validate();
    }

    const validateLocation = (location) => {
        return new StringValidator("Location", location)
            .required()
            .minLength(3)
            .validate();
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
            const { name, location } = payload;

            error.name = validateName(name);
            error.location = validateLocation(location);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }

            if(shop) {
                db.updateShop(shop.id, payload);
            } else {
                db.addShop(payload);
            }
            
            hideFn && hideFn();
        } catch(e) {
            console.log(e);
            return;
        }
    }

    return(
        <>
            <div className="flex flex-col gap-4">
                <div className="text-xl font-bold">{shop ? 'Shop Detail' : 'Add Shop'}</div>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4 mb-6">
                        <ImageUploader
                            name={"image"}
                            label="Image"
                            initialValue={shop?.image}
                            dropzoneOptions={{         
                                maxSize: 5 * 1000 * 1000 // 5MB
                            }}
                        />
                        <InputField 
                            required
                            name={"name"} 
                            label={"Name"} 
                            placeholder={"Enter shop name"}
                            defaultValue={shop?.name}
                            errorMessage={errorMessage?.name}
                        />
                        <InputField 
                            required
                            name={"location"} 
                            label={"Location"} 
                            placeholder={"Enter shop location"}
                            defaultValue={shop?.location}
                            errorMessage={errorMessage?.location}
                        />
                    </div>
                    <div className="flex justify-end gap-2.5">
                        {shop && <Button label={"Delete"} style="danger" contained onClick={() => setShowDelete(true)}/>}
                        <Button type="submit" label={shop ? 'Edit' : 'Add'} contained/>
                    </div>
                </form>
            </div>
            {shop && 
            <Dialog
                show={showDelete}
                hideFn={() => setShowDelete(false)}
                hideCancelButton
            >
                <DeleteShopForm
                    shopId={shop.id}
                    onDelete={handleDelete}
                    onCancel={() => setShowDelete(false)}
                />
            </Dialog>
            }
        </>
    )
}