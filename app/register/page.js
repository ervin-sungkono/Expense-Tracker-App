'use client'
import Layout from "@components/layout/Layout";
import TextContent from "@components/common/TextContent";
import Button from "@components/common/Button";
import InputField from "@components/common/InputField";
import { useRef, useEffect, useState } from "react";
import { useLocalStorage } from "@lib/hooks";
import { useRouter } from "next/navigation";
import Loading from "@components/layout/Loading";
import { StringValidator } from "@lib/validator";
import { toast } from "react-toastify";

export default function Register() {
    const [username, setUsername] = useLocalStorage('username');
    const [errorMessage, setErrorMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const inputRef = useRef();
    const router = useRouter();

    useEffect(() => {
        if (username && router) {
            router.replace('/home', { scroll: false });
        } else {
            setLoading(false);
        }
    }, [username, router]);

    const registerUser = () => {
        const input = inputRef.current
        if(!input) return;

        const error = new StringValidator("Name", input.value).required().minLength(3).maxLength(25).validate();

        if (error) {
            setErrorMessage(error);
            return;
        }

        toast.success('Registration complete!')
        setUsername(input.value);
    }

    if(loading) {
        return <Loading/>
    }
    return(
        <Layout pathname={'/register'} hideNavbar hideActionBar>
            <div className="h-full flex flex-col justify-center gap-4">
                <TextContent
                    title={"Get Started"}
                    description={"To start using our app, please fill in the field below."}
                />
                <InputField
                    ref={inputRef}
                    name={"username"}
                    label={"Your Name (max 25 characters)"}
                    maxLength={25}
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