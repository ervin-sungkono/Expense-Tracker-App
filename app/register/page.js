'use client'
import Layout from "../_components/layout/Layout";
import TextContent from "../_components/common/TextContent";
import Button from "../_components/common/Button";
import InputField from "../_components/common/InputField";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setCookie } from "cookies-next/client";

export default function Register() {
    const [errorMessage, setErrorMessage] = useState(null);
    const inputRef = useRef();
    const router = useRouter();

    const registerUser = async() => {
        const input = inputRef.current
        if(!input) return;

        let error = null;
        if (input.value.length === 0) {
            error = 'Name cannot be empty!';
        } else if (input.value.length > 30) {
            error = 'Name cannot be longer than 30 characters!';
        }

        if (error) {
            setErrorMessage(error);
            return;
        }

        setCookie('username', input.value);
        // TODO: replace alert with dialog
        alert('Registration success');
        router.replace('/home');
    }

    return(
        <Layout pathname={'/register'} hideNavbar>
            <div className="h-full flex flex-col justify-center gap-4">
                <TextContent
                    title={"Get Started"}
                    description={"To start using our app, please fill in the field below."}
                />
                <InputField
                    ref={inputRef}
                    name={"username"}
                    label={"Your Name (max 30 characters)"}
                    maxLength={30}
                    required
                    placeholder={"Enter your name"}
                    errorMessage={errorMessage}
                />
            </div>
            <Button 
                label="Let's Go" 
                className="absolute bottom-8 left-0 px-14"
                onClick={registerUser}
            />
        </Layout>
    )
}