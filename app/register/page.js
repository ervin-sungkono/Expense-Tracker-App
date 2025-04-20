'use client'
import Layout from "../_components/layout/Layout";
import TextContent from "../_components/common/TextContent";
import Button from "../_components/common/Button";
import InputField from "../_components/common/InputField";
import { createRef, useEffect } from "react";

export default function Register() {
    const inputRef = createRef();
    useEffect(() => {
        console.log(inputRef.current);
    }, [inputRef])

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
            />
        </Layout>
    )
}