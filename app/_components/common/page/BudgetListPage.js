'use client'
import dynamic from "next/dynamic";
import Page from "./Page";

const BudgetList = dynamic(() => import("../../budgets/BudgetList"));

export default function BudgetListPage({ show, hideFn }) {
    return (
        <Page
            title={"Budget List"}
            show={show}
            hideFn={hideFn}
        >
            <BudgetList/>
        </Page>
    )
}