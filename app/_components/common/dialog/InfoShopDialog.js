'use client'
import Dialog from "./Dialog";
import { db } from "@/app/_lib/db";
import InputField from "../InputField";
import Button from "../Button";
import { useState } from "react";
import DeleteShopDialog from "./DeleteShopDialog";
import ImageUploader from "../ImageUploader";
import { StringValidator } from "@/app/_lib/validator";

export default function InfoShopDialog({ shop, show, hideFn }) {
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
            .validate();
    }

    const validateLocation = (location) => {
        return new StringValidator("Location", location)
            .required()
            .minLength(3)
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
            </Dialog>
            {shop && 
            <DeleteShopDialog
                shopId={shop.id}
                show={showDelete}
                hideFn={() => setShowDelete(false)}
                onDelete={handleDelete}
            />}
        </>
    )
}