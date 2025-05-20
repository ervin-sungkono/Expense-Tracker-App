'use client'
import Dialog from "../common/Dialog";
import InputField from "../common/InputField";
import { useState } from "react";
import Button from "../common/Button";
import { StringValidator } from "@/app/_lib/validator";
import { useLocalStorage } from "@/app/_lib/hooks";

export default function ChangeUsernameDialog({ show, hideFn }) {
    const [errorMessage, setErrorMessage] = useState({});
    const [username, setUsername] = useLocalStorage('username');

    const validateName = (name) => {
        return new StringValidator("Name", name)
            .required()
            .minLength(3)
            .maxLength(30)
            .validate();
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

        try{
            let error = {};
            payload.budget = Number(payload.budget); // ensure that value stored is Number type
            const { name } = payload;

            error.name = validateName(name);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }

            setUsername(name)
            form.reset();
            hideFn && hideFn();
        } catch(e) {
            console.log(e);
        }
    }

    return (
        <Dialog 
            show={show} 
            hideFn={hideFn}
        >
            <div className="flex flex-col gap-4">
                <div className="text-xl font-bold">{'Change Username'}</div>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4 mb-6">
                        <InputField 
                            required
                            name={"name"} 
                            label={"New Username"} 
                            placeholder={"Enter new username"}
                            type={"text"}
                            defaultValue={username}
                            errorMessage={errorMessage?.name}
                        />
                    </div>
                    <Button type="submit" label={'Update'}/>
                </form>
            </div>
        </Dialog>
    )
}