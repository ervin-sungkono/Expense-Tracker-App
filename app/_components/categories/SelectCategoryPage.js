'use client'
import { useState } from "react";
import Page from "../common/Page";
import SearchBar from "../common/Searchbar";
import VirtualizedCategoryList from "./VirtualizedCategoryList";
import Button from "../common/Button";

export default function SelectCategoryPage({ show, hideFn, categories, onCategorySelected, onCancelSelection }) {
    const [searchText, setSearchText] = useState('');

    const handleCategoryClicked = (value) => {
        hideFn && hideFn();
        onCategorySelected && onCategorySelected(value);
    }

    const handleCancelSelection = () => {
        hideFn && hideFn();
        onCancelSelection && onCancelSelection();
    }

    return(
        <Page
            title={"Select Category"}
            show={show}
            hideFn={hideFn}
        >
            <div className="grow flex flex-col gap-4">
                <SearchBar
                    placeholder={"Search category"}
                    onSearch={(val) => setSearchText(val.toLowerCase())}
                />
                <div className="grow">
                    <VirtualizedCategoryList
                        items={categories?.filter(category => category.name.toLowerCase().includes(searchText))}
                        onCategoryClicked={handleCategoryClicked}
                    />
                </div>
                <div className="flex justify-center mt-2">
                    <Button style="danger" label={"Cancel Selection"} onClick={handleCancelSelection}/>
                </div>
            </div>
        </Page>
    )
}