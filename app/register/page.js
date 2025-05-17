'use client'
import Layout from "../_components/layout/Layout";
import TextContent from "../_components/common/TextContent";
import Button from "../_components/common/Button";
import InputField from "../_components/common/InputField";
import { useRef, useEffect, useState } from "react";
import { useLocalStorage } from "../_lib/hooks";
import { useRouter } from "next/navigation";
import Loading from "../_components/layout/Loading";

export default function Register() {
    const [username, setUsername] = useLocalStorage('username');
    const [errorMessage, setErrorMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const inputRef = useRef();
    const router = useRouter();

    useEffect(() => {
        if (username && router) {
            router.replace('/home');
        } else {
            setLoading(false);
        }
    }, [username, router]);

    const registerUser = () => {
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

        // TODO: replace alert with dialog
        alert('Registration success');
        setUsername(input.value);
    }

    if(loading) {
        return <Loading/>
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