'use client'
import dynamic from "next/dynamic";
import Page from "./Page";

const SelectCategory = dynamic(() => import("../../categories/SelectCategory"));

export default function SelectCategoryPage({ show, hideFn, categories, onCategorySelected, onCancelSelection, defaultType, showTab = false, showSearch = false, hideCancelButton = false, excludedTabs }){
    return (
         <Page
            title={"Select Category"}
            show={show}
            hideFn={hideFn}
        >
            <SelectCategory
                categories={categories}
                onCategorySelected={onCategorySelected}
                onCancelSelection={onCancelSelection}
                defaultType={defaultType}
                showTab={showTab}
                showSearch={showSearch}
                hideCancelButton={hideCancelButton}
                excludedTabs={excludedTabs}
            />
        </Page>      
    )
}