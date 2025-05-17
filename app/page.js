'use client'
import Layout from "./_components/layout/Layout";
import AppLogo from "./_components/common/AppLogo";
import SplashImage from "./_components/onboarding/SplashImage";
import TextContent from "./_components/common/TextContent";
import LinkButton from "./_components/common/LinkButton";
import { useEffect, useState } from "react";
import { useLocalStorage } from "./_lib/hooks";
import { useRouter } from "next/navigation";
import Loading from "./_components/layout/Loading";

export default function Onboarding() {
    const [loading, setLoading] = useState(true);
    const [username, _] = useLocalStorage('username');
    const router = useRouter();

    useEffect(() => {
      if(username && router) {
        router.replace('/home');
      } else {
        setLoading(false);
      }
    }, [username, router]);

    if(loading) {
      return <Loading/>
    }
    return (
        <Layout pathname="/" hideNavbar>
            <AppLogo position="center" className="mb-12"/>
            <SplashImage className="mb-10"/>
            <TextContent 
              title={"Manage and organize all your [expenses]"}
              description={"Save up money by managing and organizing your expenses and keeping track the list of shops you usually go to."}
            />
            <LinkButton 
              label={"Get Started"} 
              className="mt-16 px-8 z-fixed"
              href="/register"
              disabled={loading}
            />
        </Layout>
    );
}
