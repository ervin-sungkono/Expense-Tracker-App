'use client'
import dynamic from "next/dynamic";
import Page from "./Page";

const CategoryList = dynamic(() => import("../CategoryList"));

export default function CategoryListPage({ show, hideFn }) {
    return (
        <Page
            title={"Category List"}
            show={show}
            hideFn={hideFn}
        >
            <CategoryList/>
        </Page>
    )
}