'use client'
import Layout from "../_components/layout/Layout";
import TextContent from "../_components/common/TextContent";
import Button from "../_components/common/Button";
import InputField from "../_components/common/InputField";
import { createRef, useEffect } from "react";
import { useLocalStorage } from "../_lib/hooks";
import { useRouter } from "next/navigation";

export default function Register() {
    const [username, setUsername] = useLocalStorage('username');
    const inputRef = createRef();
    const router = useRouter

    useEffect(() => {
        if (username) router.replace('/home');
    }, [username]);

    const registerUser = () => {
        const input = inputRef.current
        if(!input) return;

        if (input.value.length === 0) {
            return alert('Name cannot be empty');
        }

        alert('Registration success');
        setUsername(input.value);
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
                    label={"Your Name"}
                    required
                    placeholder={"Enter your name"}
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