'use client'
import dynamic from "next/dynamic";
import Page from "./Page";

const AboutApp = dynamic(() => import("../../settings/AboutApp"));

export default function AboutAppPage({ show, hideFn }) {
    return (
        <Page
            title={"About Xpensed"}
            show={show}
            hideFn={hideFn}
        >
            <AboutApp/>
        </Page>
    )
}