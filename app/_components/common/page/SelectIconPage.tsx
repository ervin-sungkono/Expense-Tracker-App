'use client'
import dynamic from "next/dynamic";
import Page from "./Page";

const SelectIcon = dynamic(() => import("../../categories/SelectIcon"));

export default function SelectIconPage({ show, hideFn, onIconSelected }){
    return (
        <Page
            title={"Icon List"}
            show={show}
            hideFn={hideFn}
        >
            <SelectIcon onIconSelected={onIconSelected}/>
        </Page>
    )
}